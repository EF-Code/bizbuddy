export async function request(path, data, method = "POST") {
  const response = await fetch(`/api${path}`, {
    method: data === undefined ? "GET" : method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("bizbuddyToken") || ""}`,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "Please check the form and try again.",
    );
  return body;
}
