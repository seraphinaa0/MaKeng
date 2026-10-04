import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  repository,
  RepositoryError,
} from "../../../../../../packages/db/repository";
import { submissionInput } from "../../../../../../packages/schemas/writing";
import { prompts } from "../../../../../../packages/domain/writing";
import {
  localPreviewSets,
  findPreviewSet,
} from "../../../../../../packages/content/reading";
import { publicReadingSet } from "../../../../../../packages/domain/reading";
import { ReadingRepository } from "../../../../../../packages/db/reading";
import { saveAttemptSchema } from "../../../../../../packages/schemas/reading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "makeng_session";
type Context = { params: Promise<{ path: string[] }> };
const messages: Record<string, string> = {
  UNAUTHORIZED: "Phiên làm việc đã hết hạn. Hãy tải lại trang.",
  NOT_FOUND: "Không tìm thấy bài viết.",
  INVALID_INPUT: "Kiểm tra đề bài, bài viết và xác nhận lưu dữ liệu.",
  RATE_LIMIT: "Bạn đã đạt giới hạn 10 yêu cầu mỗi giờ. Hãy thử lại sau.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu này đã được sử dụng cho một bài khác.",
  RETRY_UNAVAILABLE: "Không thể thử lại bài này. Bản gốc vẫn được lưu.",
  FORBIDDEN: "Yêu cầu không hợp lệ.",
  TOO_LARGE: "Nội dung vượt quá giới hạn 64 KB.",
  REVISION_CONFLICT:
    "Bài đã thay đổi ở tab khác. Hãy tải bản đã lưu trước khi tiếp tục.",
  ALREADY_SUBMITTED: "Bài đã nộp, không thể thay đổi câu trả lời.",
  READING_LIMIT:
    "Bạn đã tạo 30 bài Reading trong giờ qua. Hãy tiếp tục bài đang làm.",
};
async function readBody(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new RepositoryError("INVALID_INPUT");
  const reader = request.body?.getReader();
  if (!reader) throw new RepositoryError("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new RepositoryError("TOO_LARGE", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RepositoryError("INVALID_INPUT");
  }
}
async function handle(request: NextRequest, context: Context) {
  const requestId = randomUUID();
  const json = (value: unknown, status = 200) =>
    NextResponse.json(value, {
      status,
      headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
    });
  try {
    // Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
    // Compare the browser's origin with the actual Host header; do not trust forwarded headers.
    if (process.env.NEXT_PUBLIC_MAKENG_DEMO === "true")
      return json(
        {
          code: "DEMO_ONLY",
          message: "Bản demo chỉ lưu trong trình duyệt; API local đã tắt.",
        },
        503,
      );
    const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host")}`;
    if (
      request.method !== "GET" &&
      request.headers.get("origin") !== expectedOrigin
    )
      throw new RepositoryError("FORBIDDEN", 403);
    const repo = repository();
    let token = request.cookies.get(cookieName)?.value;
    let owner = repo.owner(token);
    const path = (await context.params).path;
    if (path.join("/") === "session" && request.method === "GET") {
      if (!owner) {
        token = repo.createSession();
        owner = repo.owner(token);
      }
      const response = json({ mode: "mock", sessionId: owner, prompts });
      response.cookies.set(cookieName, token!, {
        httpOnly: true,
        sameSite: "strict",
        secure: new URL(request.url).protocol === "https:",
        path: "/",
        maxAge: 30 * 86400,
      });
      return response;
    }
    if (!owner) throw new RepositoryError("UNAUTHORIZED", 401);
    if (path[0] === "reading") {
      const reading = new ReadingRepository(repo);
      if (path.join("/") === "reading/sets" && request.method === "GET")
        return json(localPreviewSets.map(publicReadingSet));
      if (path.join("/") === "reading/attempts" && request.method === "POST") {
        const input = z
          .object({ setId: z.string() })
          .strict()
          .parse(await readBody(request));
        const set = findPreviewSet(input.setId);
        if (!set) throw new RepositoryError("NOT_FOUND", 404);
        return json(reading.start(owner, set), 201);
      }
      if (path.join("/") === "reading/attempts" && request.method === "GET") {
        const offset = z.coerce
          .number()
          .int()
          .min(0)
          .max(100000)
          .parse(request.nextUrl.searchParams.get("offset") || 0);
        const items = reading.list(owner, offset);
        return json({
          items,
          nextOffset: items.length === 20 ? offset + 20 : null,
        });
      }
      if (path[1] === "attempts" && path.length >= 3) {
        const id = z.uuid().parse(path[2]);
        if (path.length === 3 && request.method === "GET")
          return json(reading.get(owner, id));
        if (
          path.length === 4 &&
          path[3] === "answers" &&
          request.method === "POST"
        )
          return json(
            reading.save(
              owner,
              id,
              saveAttemptSchema.parse(await readBody(request)),
            ),
          );
        if (
          path.length === 4 &&
          path[3] === "submit" &&
          request.method === "POST"
        ) {
          const { revision } = z
            .object({ revision: z.number().int().nonnegative() })
            .strict()
            .parse(await readBody(request));
          return json(reading.submit(owner, id, revision));
        }
      }
      throw new RepositoryError("NOT_FOUND", 404);
    }
    if (path.join("/") === "session" && request.method === "DELETE") {
      repo.deleteAll(owner);
      const response = json({ deleted: true });
      response.cookies.delete(cookieName);
      return response;
    }
    if (path[0] === "jobs" && path.length === 2 && request.method === "GET")
      return json(repo.get(owner, path[1]));
    if (path[0] !== "writing" || path[1] !== "submissions")
      throw new RepositoryError("NOT_FOUND", 404);
    if (path.length === 2 && request.method === "GET") {
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(request.nextUrl.searchParams.get("offset") || 0);
      const items = repo.list(owner, offset);
      return json({
        items,
        nextOffset: items.length === 20 ? offset + 20 : null,
      });
    }
    if (path.length === 2 && request.method === "POST") {
      const input = submissionInput.parse(await readBody(request));
      const key = z.uuid().parse(request.headers.get("idempotency-key"));
      const item = repo.create(owner, key, input);
      return json({ ...item, jobId: item.id }, 202);
    }
    const id = z.uuid().parse(path[2]);
    if (path.length === 3 && request.method === "GET")
      return json(repo.get(owner, id));
    if (path.length === 3 && request.method === "DELETE") {
      repo.delete(owner, id);
      return json({ deleted: true });
    }
    if (path.length === 4 && path[3] === "retry" && request.method === "POST")
      return json(repo.retry(owner, id), 202);
    throw new RepositoryError("NOT_FOUND", 404);
  } catch (error) {
    const code =
      error instanceof RepositoryError
        ? error.code
        : error instanceof z.ZodError
          ? "INVALID_INPUT"
          : "INTERNAL_ERROR";
    const status =
      error instanceof RepositoryError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : 500;
    if (status === 500) console.error(JSON.stringify({ requestId, code }));
    return json(
      {
        code,
        message:
          messages[code] ||
          "Chưa thể xử lý yêu cầu. Bản nháp của bạn vẫn được giữ.",
        requestId,
      },
      status,
    );
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
