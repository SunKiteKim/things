export function getEmailFormatError(email: string) {
  const value = email.trim().toLowerCase();
  if (!value) return "이메일을 입력하세요.";
  if (value.length > 254) return "이메일이 너무 깁니다.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "이메일 형식이 올바르지 않습니다.";
  return null;
}

export function getPasswordError(password: string) {
  if (!password) return "비밀번호를 입력하세요.";
  if (password.length < 10 || password.length > 72) return "비밀번호는 10~72자여야 합니다.";
  if (!/[A-Z]/.test(password)) return "영문 대문자를 1자 이상 포함해야 합니다.";
  if (!/\d/.test(password)) return "숫자를 1자 이상 포함해야 합니다.";
  return null;
}

export function getPasswordConfirmError(password: string, confirm: string) {
  if (!confirm) return "비밀번호 확인을 입력하세요.";
  if (password !== confirm) return "비밀번호가 일치하지 않습니다.";
  return null;
}
