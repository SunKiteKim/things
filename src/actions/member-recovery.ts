"use server";

import { findMemberIds, resetMemberPasswordByIdentity } from "@/lib/member-recovery";

export async function submitMemberRecovery(formData: FormData) {
  try {
    const mode = String(formData.get("mode") ?? "");
    if (mode === "account") {
      return await findMemberIds({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      });
    }
    if (mode !== "password") return { error: "요청을 확인하세요." };
    return await resetMemberPasswordByIdentity({
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirm: String(formData.get("confirm") ?? ""),
    });
  } catch {
    return { error: "복구 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
