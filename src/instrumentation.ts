// Next.js calls register() once when the server starts, before it handles any request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartup } = await import("./lib/startup");
    await runStartup();
  }
}
