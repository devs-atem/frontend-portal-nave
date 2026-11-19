import { describe, it, expect, vi } from "vitest";

import type { IHttpService } from "@core/http/models/IHttpService";
import { CONTRACTS_ENDPOINTS } from "./contract";
import { FilesService, MAX_ATTACHMENT_BYTES, validateAttachmentFile } from "./FilesService";

const mk = (over: Record<string, unknown>): IHttpService => over as unknown as IHttpService;

describe("FilesService", () => {
  it("upload envia multipart com o campo `file`", async () => {
    const post = vi.fn(async () => ({ key: "k1", originalName: "a.pdf" }));
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    await expect(new FilesService(mk({ post })).upload(file)).resolves.toEqual({
      key: "k1",
      originalName: "a.pdf",
    });
    const [path, body] = post.mock.calls[0] as unknown as [string, FormData];
    expect(path).toBe(CONTRACTS_ENDPOINTS.files);
    expect(body).toBeInstanceOf(FormData);
    expect((body.get("file") as File).name).toBe("a.pdf");
  });

  it("attachToContract confirma as chaves como CONTRACT", async () => {
    const post = vi.fn(async () => []);
    await new FilesService(mk({ post })).attachToContract("c1", ["k1"]);
    expect(post).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.attachments, {
      entityType: "CONTRACT",
      entityId: "c1",
      keys: ["k1"],
    });
  });

  it("download pede o arquivo como blob", async () => {
    const get = vi.fn(async () => new Blob(["x"]));
    await new FilesService(mk({ get })).download("a1");
    expect(get).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.attachmentDownload("a1"), undefined, "blob");
  });

  it("rejeita arquivo acima de 20 MB", () => {
    const big = { size: MAX_ATTACHMENT_BYTES + 1 } as File;
    expect(validateAttachmentFile(big)).toMatch(/20 MB/);
    expect(validateAttachmentFile({ size: 10 } as File)).toBeNull();
  });
});
