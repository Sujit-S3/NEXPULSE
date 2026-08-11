import os

from nexpulse import ClientOptions, NexpulseClient

client = NexpulseClient(ClientOptions(api_key=os.environ["NEXPULSE_API_KEY"]))
print(client.workspaces.list())
