import { debugLog } from './utils'

/**
 * OAuth 2.0 Authorization Server Metadata as defined in RFC 8414
 * https://datatracker.ietf.org/doc/html/rfc8414#section-2
 */
export interface AuthorizationServerMetadata {
  /** The authorization server's issuer identifier */
  issuer: string
  /** URL of the authorization server's authorization endpoint */
  authorization_endpoint?: string
  /** URL of the authorization server's token endpoint */
  token_endpoint?: string
  /** JSON array containing a list of the OAuth 2.0 scope values that this server supports */
  scopes_supported?: string[]
  /** JSON array containing a list of the OAuth 2.0 response_type values that this server supports */
  response_types_supported?: string[]
  /** JSON array containing a list of the OAuth 2.0 grant type values that this server supports */
  grant_types_supported?: string[]
  /** JSON array containing a list of client authentication methods supported by this token endpoint */
  token_endpoint_auth_methods_supported?: string[]
  /** Additional metadata fields */
  [key: string]: unknown
}

/**
 * Constructs the well-known URL for OAuth authorization server metadata
 * @param serverUrl The base server URL
 * @returns The well-known metadata URL
 */
export function getMetadataUrl(serverUrl: string): string {
  const url = new URL(serverUrl)
  const metadataPath = '/.well-known/oauth-authorization-server'

  return `${url.origin}${url.pathname.replace(/\/$/, '')}${metadataPath}`
}

/**
 * Fetches OAuth 2.0 Authorization Server Metadata from the well-known endpoint
 * @param serverUrl The server URL to fetch metadata for
 * @returns The authorization server metadata, or undefined if fetch fails
 */
export async function fetchAuthorizationServerMetadata(serverUrl: string): Promise<AuthorizationServerMetadata | undefined> {
  const url = new URL(serverUrl)
  const base = `${url.origin}${url.pathname.replace(/\/$/, '')}`
  const urlsToTry = [`${base}/.well-known/oauth-authorization-server`, `${base}/.well-known/openid-configuration`]

  for (const metadataUrl of urlsToTry) {
    try {
      debugLog('Fetching authorization server metadata', { serverUrl, metadataUrl })
      const response = await fetch(metadataUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        debugLog('Authorization server metadata endpoint not found', { metadataUrl, status: response.status })
        continue
      }

      const metadata = (await response.json()) as AuthorizationServerMetadata
      debugLog('Successfully fetched authorization server metadata', { issuer: metadata.issuer })
      return metadata
    } catch (error) {
      debugLog('Error fetching authorization server metadata', {
        metadataUrl,
        error: String(error),
      })
    }
  }

  return undefined
}
