// Escribe archivos en el repo con la API de contenidos de GitHub (un commit por archivo)

export interface GitHubClient {
  putFile(path: string, content: string, message: string): Promise<{ commitSha: string }>;
}

export function createGitHub(token: string, repo: string, branch: string): GitHubClient {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  async function currentSha(path: string): Promise<string | undefined> {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(path)}?ref=${branch}`, { headers });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status} ${await res.text()}`);
    return ((await res.json()) as { sha: string }).sha;
  }

  return {
    async putFile(path, content, message) {
      // Un reintento si el sha cambió entre la lectura y la escritura (409/422)
      for (let attempt = 0; attempt < 2; attempt++) {
        const sha = await currentSha(path);
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(path)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message,
            branch,
            content: Buffer.from(content, "utf8").toString("base64"),
            sha,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { commit: { sha: string } };
          return { commitSha: json.commit.sha };
        }
        if ((res.status === 409 || res.status === 422) && attempt === 0) continue;
        throw new Error(`GitHub PUT ${path}: ${res.status} ${await res.text()}`);
      }
      throw new Error(`GitHub PUT ${path}: conflicto persistente`);
    },
  };
}
