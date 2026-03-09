// ENRICH-02: convention detection threshold logic

import { detectConventions, classifyNameStyle, dominantStyle } from '../../src/analyzer/patternDetector.js'

describe('classifyNameStyle', () => {
  test('returns camelCase for getUserById', () => {
    expect(classifyNameStyle('getUserById')).toBe('camelCase')
  })

  test('returns PascalCase for UserService', () => {
    expect(classifyNameStyle('UserService')).toBe('PascalCase')
  })

  test('returns snake_case for get_user_by_id', () => {
    expect(classifyNameStyle('get_user_by_id')).toBe('snake_case')
  })

  test('returns SCREAMING_SNAKE_CASE for MAX_RETRIES', () => {
    expect(classifyNameStyle('MAX_RETRIES')).toBe('SCREAMING_SNAKE_CASE')
  })

  test('returns kebab-case for my-module', () => {
    expect(classifyNameStyle('my-module')).toBe('kebab-case')
  })

  test('returns null for single-word identifier analyze', () => {
    expect(classifyNameStyle('analyze')).toBeNull()
  })

  test('returns null for single-word identifier scan', () => {
    expect(classifyNameStyle('scan')).toBeNull()
  })
})

describe('dominantStyle', () => {
  test('returns camelCase when it has 5/6 = 83% share', () => {
    expect(dominantStyle({ camelCase: 5, snake_case: 1 }, 5, 0.6)).toBe('camelCase')
  })

  test('returns null when neither style clears 60% (3 vs 3, total >= 5)', () => {
    expect(dominantStyle({ camelCase: 3, snake_case: 3 }, 5, 0.6)).toBeNull()
  })

  test('returns null when total < minSamples (total=4)', () => {
    expect(dominantStyle({ camelCase: 4 }, 5, 0.6)).toBeNull()
  })
})

describe('ENRICH-02: Convention detection', () => {
  test('detectConventions returns null when fewer than 5 method name samples', () => {
    const deepAnalysis = [
      {
        file: 'foo.js',
        language: 'JavaScript',
        className: null,
        methods: [
          { name: 'getUserById', params: '', returnType: '', annotation: null, lineNumber: 1 },
          { name: 'createUser', params: '', returnType: '', annotation: null, lineNumber: 2 },
          { name: 'deleteUser', params: '', returnType: '', annotation: null, lineNumber: 3 },
        ],
        imports: [],
      },
    ]
    const result = detectConventions(deepAnalysis, [])
    // 3 method samples < 5, so methods dimension should not appear
    // No classes, no files with classifiable names, no imports
    expect(result).toBeNull()
  })

  test('detectConventions returns null when dominant style is below 60% ratio', () => {
    // 3 camelCase + 3 snake_case = 6 samples, but neither clears 60%
    const deepAnalysis = [
      {
        file: 'foo.js',
        language: 'JavaScript',
        className: null,
        methods: [
          { name: 'getUserById', params: '', returnType: '', annotation: null, lineNumber: 1 },
          { name: 'createUser', params: '', returnType: '', annotation: null, lineNumber: 2 },
          { name: 'deleteUser', params: '', returnType: '', annotation: null, lineNumber: 3 },
          { name: 'get_user', params: '', returnType: '', annotation: null, lineNumber: 4 },
          { name: 'create_user', params: '', returnType: '', annotation: null, lineNumber: 5 },
          { name: 'delete_user', params: '', returnType: '', annotation: null, lineNumber: 6 },
        ],
        imports: [],
      },
    ]
    const result = detectConventions(deepAnalysis, [])
    expect(result).toBeNull()
  })

  test('detectConventions returns correct style when camelCase dominates at 80%', () => {
    // 6 camelCase methods with one extra = 6 total camelCase classifiable names
    const deepAnalysis = [
      {
        file: 'foo.js',
        language: 'JavaScript',
        className: null,
        methods: [
          { name: 'getUserById', params: '', returnType: '', annotation: null, lineNumber: 1 },
          { name: 'createUser', params: '', returnType: '', annotation: null, lineNumber: 2 },
          { name: 'deleteUser', params: '', returnType: '', annotation: null, lineNumber: 3 },
          { name: 'updateUser', params: '', returnType: '', annotation: null, lineNumber: 4 },
          { name: 'findUser', params: '', returnType: '', annotation: null, lineNumber: 5 },
          { name: 'listUsers', params: '', returnType: '', annotation: null, lineNumber: 6 },
        ],
        imports: [],
      },
    ]
    const result = detectConventions(deepAnalysis, [])
    expect(result).not.toBeNull()
    expect(result.methods).toBeDefined()
    expect(result.methods.style).toBe('camelCase')
    expect(result.methods.example).toBe('getUserById')
  })

  test('detectConventions returns correct style when PascalCase dominates classes', () => {
    // We need 5 class entries with PascalCase names
    const deepAnalysis = [
      { file: 'UserService.java', language: 'Java', className: 'UserService', methods: [], imports: [] },
      { file: 'OrderService.java', language: 'Java', className: 'OrderService', methods: [], imports: [] },
      { file: 'ProductService.java', language: 'Java', className: 'ProductService', methods: [], imports: [] },
      { file: 'PaymentService.java', language: 'Java', className: 'PaymentService', methods: [], imports: [] },
      { file: 'CartService.java', language: 'Java', className: 'CartService', methods: [], imports: [] },
    ]
    const result = detectConventions(deepAnalysis, [])
    expect(result).not.toBeNull()
    expect(result.classes).toBeDefined()
    expect(result.classes.style).toBe('PascalCase')
  })

  test('detectConventions returns null for methods when all names are single-word (unclassifiable)', () => {
    const deepAnalysis = [
      {
        file: 'foo.js',
        language: 'JavaScript',
        className: null,
        methods: [
          { name: 'run', params: '', returnType: '', annotation: null, lineNumber: 1 },
          { name: 'start', params: '', returnType: '', annotation: null, lineNumber: 2 },
          { name: 'stop', params: '', returnType: '', annotation: null, lineNumber: 3 },
          { name: 'init', params: '', returnType: '', annotation: null, lineNumber: 4 },
          { name: 'load', params: '', returnType: '', annotation: null, lineNumber: 5 },
          { name: 'save', params: '', returnType: '', annotation: null, lineNumber: 6 },
        ],
        imports: [],
      },
    ]
    const result = detectConventions(deepAnalysis, [])
    expect(result).toBeNull()
  })

  test('detectConventions detects file naming style from codeFiles list', () => {
    // 5+ camelCase file stems should be detected
    const codeFiles = [
      'userService.js',
      'orderService.js',
      'productService.js',
      'paymentService.js',
      'cartService.js',
    ]
    const result = detectConventions([], codeFiles)
    expect(result).not.toBeNull()
    expect(result.files).toBeDefined()
    expect(result.files.style).toBe('camelCase')
  })

  test('detectConventions detects import style from deepAnalysis imports arrays', () => {
    const deepAnalysis = [
      {
        file: 'foo.js',
        language: 'JavaScript',
        className: null,
        methods: [],
        imports: [
          '../config/patterns.js',
          '../analyzer/patternDetector.js',
          '../utils/helpers.js',
          '../services/userService.js',
          '../models/user.js',
        ],
      },
    ]
    const result = detectConventions(deepAnalysis, [])
    expect(result).not.toBeNull()
    expect(result.imports).toBeDefined()
    expect(result.imports.style).toBe('relative-with-extension')
  })

  test('detectConventions returns null when no dimension meets threshold', () => {
    const result = detectConventions([], [])
    expect(result).toBeNull()
  })
})
