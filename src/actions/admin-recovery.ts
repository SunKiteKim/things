"use server";

import { recoverAdmin } from "@/lib/admin-recovery";

export async function submitAdminRecovery(formData: FormData) {
  try {
    return await recoverAdmin({
      code: String(formData.get("code") ?? ""),
      mode: String(formData.get("mode") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirm: String(formData.get("confirm") ?? ""),
    });
  } catch {
    return { error: "복구 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
