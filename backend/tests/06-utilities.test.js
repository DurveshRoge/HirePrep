const {
  formatResponse,
  isValidObjectId,
  generateRandomString,
  bufferToBase64,
  sanitizeFilename,
  getFileExtension,
  isValidEmail,
  isValidPhone,
  calculateAge,
  formatPaginationResponse
} = require('../src/utils/helpers');

describe('Utility Helpers Module', () => {
  test('formatResponse shapes success payload correctly', () => {
    const out = formatResponse(true, { x: 1 }, 'hello', 200);
    expect(out.success).toBe(true);
    expect(out.data).toEqual({ x: 1 });
    expect(out.message).toBe('hello');
    expect(out.statusCode).toBe(200);
    expect(typeof out.timestamp).toBe('string');
  });

  test('isValidObjectId recognizes valid 24-char hex', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('not-an-id')).toBe(false);
    expect(isValidObjectId('')).toBe(false);
  });

  test('generateRandomString returns string of requested length', () => {
    const s = generateRandomString(16);
    expect(s).toHaveLength(16);
    expect(/^[A-Za-z0-9]+$/.test(s)).toBe(true);
  });

  test('generateRandomString defaults to length 10', () => {
    expect(generateRandomString()).toHaveLength(10);
  });

  test('bufferToBase64 converts buffer correctly', () => {
    const buf = Buffer.from('hello');
    expect(bufferToBase64(buf)).toBe('aGVsbG8=');
  });

  test('sanitizeFilename strips unsafe characters', () => {
    expect(sanitizeFilename('my file!@#.pdf')).toBe('my_file___.pdf');
  });

  test('getFileExtension returns lowercase extension', () => {
    expect(getFileExtension('Resume.PDF')).toBe('.pdf');
    expect(getFileExtension('doc.DOCX')).toBe('.docx');
  });

  test('isValidEmail accepts well-formed emails and rejects bad ones', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('u.s+tag@ex.co.uk')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  test('isValidPhone accepts international/US formats', () => {
    expect(isValidPhone('+1 555-123-4567')).toBe(true);
    expect(isValidPhone('(555) 123 4567')).toBe(true);
    expect(isValidPhone('abc')).toBe(false);
  });

  test('calculateAge returns integer years from birth date', () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    tenYearsAgo.setDate(tenYearsAgo.getDate() - 1);
    expect(calculateAge(tenYearsAgo)).toBe(10);
  });

  test('formatPaginationResponse reports hasNext/hasPrev correctly', () => {
    const page1 = formatPaginationResponse([], 1, 10, 55);
    expect(page1.pagination.hasNext).toBe(true);
    expect(page1.pagination.hasPrev).toBe(false);
    expect(page1.pagination.pages).toBe(6);

    const page6 = formatPaginationResponse([], 6, 10, 55);
    expect(page6.pagination.hasNext).toBe(false);
    expect(page6.pagination.hasPrev).toBe(true);
  });
});
