import { NexpulseClient } from "@nexpulse/sdk";

const client = new NexpulseClient({ apiKey: process.env.NEXPULSE_API_KEY });
const workspaces = await client.workspaces.list();
console.log(workspaces);
