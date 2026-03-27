import fs from 'node:fs'
import path from 'node:path'

const sdkAuthPath = path.join(
  process.cwd(),
  'node_modules',
  '@modelcontextprotocol',
  'sdk',
  'dist',
  'esm',
  'client',
  'auth.js',
)

if (!fs.existsSync(sdkAuthPath)) {
  process.exit(0)
}

let source = fs.readFileSync(sdkAuthPath, 'utf8')

function replaceExact(oldText, newText, label) {
  if (source.includes(newText)) {
    return
  }

  if (!source.includes(oldText)) {
    throw new Error(`Could not find expected SDK snippet for ${label}`)
  }

  source = source.replace(oldText, newText)
}

replaceExact(
  `    const resource = await selectResourceURL(serverUrl, provider, resourceMetadata);\n    const metadata = await discoverAuthorizationServerMetadata(authorizationServerUrl, {\n        fetchFn\n    });\n`,
  `    const resource = await selectResourceURL(serverUrl, provider, resourceMetadata);\n    let metadata;\n    if (typeof provider.getAuthorizationServerMetadata === 'function') {\n        try {\n            metadata = await provider.getAuthorizationServerMetadata();\n        }\n        catch {\n            // Fall back to discovery below\n        }\n    }\n    if (!metadata) {\n        metadata = await discoverAuthorizationServerMetadata(authorizationServerUrl, {\n            fetchFn\n        });\n    }\n`,
  'provider metadata fallback',
)

replaceExact(
  `        const wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname);\n`,
  `        const wellKnownPath = buildWellKnownPath(wellKnownType, issuer.pathname, { prependPathname: true });\n`,
  'path-aware well-known discovery',
)

replaceExact(
  `    if (!hasPath) {\n        // Root path: https://example.com/.well-known/oauth-authorization-server\n        urlsToTry.push({\n            url: new URL('/.well-known/oauth-authorization-server', url.origin),\n            type: 'oauth'\n        });\n        // OIDC: https://example.com/.well-known/openid-configuration\n        urlsToTry.push({\n            url: new URL(\`/.well-known/openid-configuration\`, url.origin),\n            type: 'oidc'\n        });\n        return urlsToTry;\n    }\n    // Strip trailing slash from pathname to avoid double slashes\n    let pathname = url.pathname;\n    if (pathname.endsWith('/')) {\n        pathname = pathname.slice(0, -1);\n    }\n    // 1. OAuth metadata at the given URL\n    // Insert well-known before the path: https://example.com/.well-known/oauth-authorization-server/tenant1\n    urlsToTry.push({\n        url: new URL(\`/.well-known/oauth-authorization-server\${pathname}\`, url.origin),\n        type: 'oauth'\n    });\n    // 2. OIDC metadata endpoints\n    // RFC 8414 style: Insert /.well-known/openid-configuration before the path\n    urlsToTry.push({\n        url: new URL(\`/.well-known/openid-configuration\${pathname}\`, url.origin),\n        type: 'oidc'\n    });\n    // OIDC Discovery 1.0 style: Append /.well-known/openid-configuration after the path\n    urlsToTry.push({\n        url: new URL(\`\${pathname}/.well-known/openid-configuration\`, url.origin),\n        type: 'oidc'\n    });\n`,
  `    if (!hasPath) {\n        // Root path: https://example.com/.well-known/oauth-authorization-server\n        urlsToTry.push({\n            url: new URL(url.origin + url.pathname.replace(/\\/$/, '') + '/.well-known/oauth-authorization-server'),\n            type: 'oauth'\n        });\n        // OIDC: https://example.com/.well-known/openid-configuration\n        urlsToTry.push({\n            url: new URL(url.origin + url.pathname.replace(/\\/$/, '') + '/.well-known/openid-configuration'),\n            type: 'oidc'\n        });\n        return urlsToTry;\n    }\n    // Strip trailing slash from pathname to avoid double slashes\n    let pathname = url.pathname;\n    if (pathname.endsWith('/')) {\n        pathname = pathname.slice(0, -1);\n    }\n    // 1. OAuth metadata at the given URL\n    // Insert well-known before the path: https://example.com/.well-known/oauth-authorization-server/tenant1\n    urlsToTry.push({\n        url: new URL(url.origin + url.pathname.replace(/\\/$/, '') + '/.well-known/oauth-authorization-server'),\n        type: 'oauth'\n    });\n    // 2. OIDC metadata endpoints\n    // RFC 8414 style: Insert /.well-known/openid-configuration before the path\n    urlsToTry.push({\n        url: new URL(url.origin + url.pathname.replace(/\\/$/, '') + '/.well-known/openid-configuration'),\n        type: 'oidc'\n    });\n    // OIDC Discovery 1.0 style: Append /.well-known/openid-configuration after the path\n    urlsToTry.push({\n        url: new URL(url.origin + url.pathname.replace(/\\/$/, '') + '/.well-known/openid-configuration'),\n        type: 'oidc'\n    });\n`,
  'authorization metadata URL order',
)

replaceExact(
  `async function executeTokenRequest(authorizationServerUrl, { metadata, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn }) {\n    const tokenUrl = metadata?.token_endpoint ? new URL(metadata.token_endpoint) : new URL('/token', authorizationServerUrl);\n`,
  `async function executeTokenRequest(authorizationServerUrl, { metadata, tokenRequestParams, clientInformation, addClientAuthentication, resource, fetchFn }) {\n    const tokenUrl = metadata?.token_endpoint ? new URL(metadata.token_endpoint) : new URL(authorizationServerUrl.replace(/\\/$/, '') + '/token');\n`,
  'token endpoint fallback',
)

replaceExact(
  `    else if (clientInformation) {\n        const supportedMethods = metadata?.token_endpoint_auth_methods_supported ?? [];\n        const authMethod = selectClientAuthMethod(clientInformation, supportedMethods);\n        applyClientAuthentication(authMethod, clientInformation, headers, tokenRequestParams);\n    }\n    const response = await (fetchFn ?? fetch)(tokenUrl, {\n`,
  `    else if (clientInformation) {\n        const supportedMethods = metadata?.token_endpoint_auth_methods_supported ?? [];\n        const authMethod = selectClientAuthMethod(clientInformation, supportedMethods);\n        applyClientAuthentication(authMethod, clientInformation, headers, tokenRequestParams);\n    }\n    console.error('TOKEN REQUEST URL:', tokenUrl.href);\n    console.error('TOKEN REQUEST BODY:', tokenRequestParams.toString());\n    console.error('TOKEN REQUEST HEADERS:', [...headers.entries()]);\n    const response = await (fetchFn ?? fetch)(tokenUrl, {\n`,
  'token request debug logging',
)

fs.writeFileSync(sdkAuthPath, source)