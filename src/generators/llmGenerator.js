import { readFileSync, writeFileSync } from 'fs'
import { posix } from 'path'

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = 'https://models.github.ai/inference/chat/completions'

const SYSTEM_PROMPT = `You are a technical documentation writer. You will receive pre-analyzed documentation for multiple folders in a software project.

For each folder, rewrite the documentation to be clearer, more actionable, and better structured for AI agents reading it as context.

Rules:
- Keep each folder document under 300 lines
- Use markdown formatting
- Preserve technical accuracy — do not invent information not present in the input
- Output each folder's documentation preceded by exactly this delimiter on its own line:
  === FOLDER: <folder-relative-path> ===
- Include all folders from the input. Do not skip any.`

const MODEL_LIMITS = {
  'openai/gpt-4o':                    128_000,
  'openai/gpt-4o-mini':               128_000,
  'openai/gpt-4.1':                 1_000_000,
  'meta/llama-3.3-70b-instruct':      32_000,
  'mistral/mistral-large-2411':       32_000,
  'ai21-labs/jamba-1.5-large':        32_000,
}

const DELIMITER_RE = /^=== FOLDER:\s*(.+?)\s*===$/m

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Estimates token count for a text string.
 * Uses the approximation: 1 token ≈ 0.75 words.
 * @param {string} text
 * @returns {number} Estimated token count (always >= 1 for non-empty input)
 */
export function estimateTokens(text) {
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(wordCount / 0.75)
}

/**
 * Parses a delimited LLM response into a Map of folder path → content.
 * Fails hard (throws) if any expected folder path is missing or has empty content.
 *
 * @param {string} responseText - Full LLM response text with === FOLDER: path === delimiters
 * @param {string[]} expectedFolderPaths - Folder paths the LLM was asked to document
 * @returns {Map<string, string>} Map where key=folderPath, value=folder documentation content
 * @throws {Error} If any expected folder path is missing or has empty content in the response
 */
export function parseResponse(responseText, expectedFolderPaths) {
  // Split on DELIMITER_RE — result alternates: ['preamble', 'path1', 'content1', 'path2', 'content2', ...]
  const parts = responseText.split(DELIMITER_RE)

  // parts[0] is anything before the first delimiter (usually empty)
  // parts[1] is first folder path, parts[2] is its content, etc.
  const resultMap = new Map()

  for (let i = 1; i < parts.length - 1; i += 2) {
    const folderPath = parts[i].trim()
    const content = parts[i + 1] ? parts[i + 1].trim() : ''

    if (!content) {
      throw new Error(`LLM returned empty content for folder: ${folderPath}`)
    }

    resultMap.set(folderPath, content)
  }

  // Validate all expected folders are present
  for (const expectedPath of expectedFolderPaths) {
    if (!resultMap.has(expectedPath)) {
      throw new Error(`LLM response missing content for folder: ${expectedPath}`)
    }
  }

  return resultMap
}

/**
 * Reads static pre-rendered markdown files, sends them all to the GitHub Models API
 * in a single prompt, parses the delimited response, and overwrites the original files
 * with LLM-enriched content.
 *
 * Fails hard on any API error, empty response, or missing folder in the response.
 * No timeout, no streaming, no silent fallback.
 *
 * @param {string[]} generatedPaths - Absolute paths to pre-rendered .md files
 * @param {Object[]} folders - Folder metadata objects (with .relativePath property)
 * @param {Object} options - { llmModel: string, verbose?: boolean }
 */
export async function generateLLMInstructions(generatedPaths, folders, options) {
  const { llmModel, verbose = true } = options

  if (verbose) {
    console.log(`  Sending ${generatedPaths.length} folders to LLM (${llmModel})...`)
  }

  // Build user prompt: one section per folder, prefixed with the delimiter
  const sections = generatedPaths.map((outputPath, index) => {
    const folder = folders[index]
    const relativePath = posix.normalize(folder.relativePath)
    const fileContent = readFileSync(outputPath, 'utf8')
    return `=== FOLDER: ${relativePath} ===\n${fileContent}`
  })

  const userPrompt = sections.join('\n\n')

  // Estimate token count and enforce model context limit
  const combinedText = SYSTEM_PROMPT + '\n' + userPrompt
  const estimatedTokens = estimateTokens(combinedText)
  const tokenLimit = MODEL_LIMITS[llmModel] ?? 32_000

  if (estimatedTokens > tokenLimit) {
    console.error(
      `\n  Error: Combined prompt (~${estimatedTokens} tokens) exceeds model limit (${tokenLimit} tokens) for ${llmModel}.`
    )
    console.error('  Reduce the number of folders or choose a model with a larger context window.\n')
    process.exit(1)
  }

  // Call the GitHub Models API
  let response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
  } catch (err) {
    console.error(`\n  Error: Network request to GitHub Models API failed: ${err.message}\n`)
    process.exit(1)
  }

  if (!response.ok) {
    const body = await response.text()
    console.error(`\n  Error: GitHub Models API returned ${response.status}.`)
    if (response.status === 401 || response.status === 403) {
      console.error('  Ensure your GITHUB_TOKEN has the `models:read` permission.')
      console.error('  For fine-grained PATs, add the Models (read-only) permission.')
    }
    console.error(`  Response: ${body.slice(0, 200)}\n`)
    process.exit(1)
  }

  const data = await response.json()
  const responseText = data.choices[0].message.content

  if (!responseText?.trim()) {
    console.error('\n  Error: LLM returned an empty response.\n')
    process.exit(1)
  }

  // Get expected folder paths (posix-normalized) — same paths embedded in the prompt
  const expectedFolderPaths = folders.map(folder => posix.normalize(folder.relativePath))

  // Parse and validate the delimited response — throws if any folder is missing
  const contentMap = parseResponse(responseText, expectedFolderPaths)

  // Write each folder's LLM-enriched content back to the original output path
  for (const [folderPath, content] of contentMap.entries()) {
    const pathIndex = expectedFolderPaths.indexOf(folderPath)
    if (pathIndex === -1) continue
    const outputPath = generatedPaths[pathIndex]
    if (verbose) {
      console.log(`  Writing LLM output for ${folderPath}...`)
    }
    writeFileSync(outputPath, content, 'utf8')
  }

  if (verbose) {
    console.log(`\n  Generated ${generatedPaths.length} files (LLM-enriched).\n`)
  }
}
