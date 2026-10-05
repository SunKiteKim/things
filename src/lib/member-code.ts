export function memberMids(users: Array<{ id: string; createdAt: Date }>) {
  return new Map(
    [...users]
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
      .map((user, index) => [user.id, `M${String(index + 1).padStart(4, "0")}`]),
  );
}
