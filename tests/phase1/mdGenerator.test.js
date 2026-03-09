// OUTPUT-01: buildConventionsSection rendering

import { buildConventionsSection } from '../../src/generators/mdGenerator.js'

describe('OUTPUT-01: buildConventionsSection', () => {
  test('returns null when conventions argument is null', () => {
    expect(buildConventionsSection(null)).toBeNull()
  })

  test('returns null when conventions argument is empty object', () => {
    expect(buildConventionsSection({})).toBeNull()
  })

  test('renders Methods bullet with style and example', () => {
    const result = buildConventionsSection({ methods: { style: 'camelCase', example: 'getUserById' } })
    expect(result).toContain('- **Methods**: camelCase (e.g. `getUserById`)')
  })

  test('renders Classes bullet with style and example', () => {
    const result = buildConventionsSection({ classes: { style: 'PascalCase', example: 'UserService' } })
    expect(result).toContain('- **Classes**: PascalCase (e.g. `UserService`)')
  })

  test('renders Files bullet with style and example', () => {
    const result = buildConventionsSection({ files: { style: 'camelCase', example: 'userService.js' } })
    expect(result).toContain('- **Files**: camelCase (e.g. `userService.js`)')
  })

  test('renders Imports bullet with human-readable label for relative-with-extension', () => {
    const result = buildConventionsSection({ imports: { style: 'relative-with-extension', example: '../config/patterns.js' } })
    expect(result).toContain('relative paths with `.js` extension')
  })

  test('renders Imports bullet with human-readable label for relative-bare', () => {
    const result = buildConventionsSection({ imports: { style: 'relative-bare', example: '../utils' } })
    expect(result).toContain('relative paths without extension')
  })

  test('renders Imports bullet with human-readable label for absolute-bare', () => {
    const result = buildConventionsSection({ imports: { style: 'absolute-bare', example: 'lodash' } })
    expect(result).toContain('absolute/package paths')
  })

  test('omits bullet for null convention dimensions', () => {
    const result = buildConventionsSection({ methods: { style: 'camelCase', example: 'doThing' } })
    expect(result).not.toContain('**Classes**')
    expect(result).not.toContain('**Files**')
    expect(result).not.toContain('**Imports**')
  })

  test('renders multi-language Methods array', () => {
    const result = buildConventionsSection({
      methods: [
        { style: 'camelCase', example: 'getUserById', lang: 'Java' },
        { style: 'snake_case', example: 'get_user_by_id', lang: 'Python' },
      ]
    })
    expect(result).toContain('- **Methods (Java)**: camelCase (e.g. `getUserById`)')
    expect(result).toContain('- **Methods (Python)**: snake_case (e.g. `get_user_by_id`)')
  })
})
