import { OperationResult } from '../OperationResult.js';

describe('OperationResult', () => {
  describe('constructor', () => {
    it('creates a successful result with data', () => {
      const result = new OperationResult(true, 'Todo bien', { id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Todo bien');
      expect(result.data).toEqual({ id: 1 });
    });

    it('creates a failed result without data', () => {
      const result = new OperationResult(false, 'Algo falló');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Algo falló');
      expect(result.data).toBeNull();
    });

    it('defaults all parameters when called with no args', () => {
      const result = new OperationResult();
      expect(result.success).toBe(false);
      expect(result.message).toBe('');
      expect(result.data).toBeNull();
    });

    it('stores arrays as data', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = new OperationResult(true, 'Lista', items);
      expect(result.data).toHaveLength(2);
    });

    it('stores null data explicitly', () => {
      const result = new OperationResult(true, 'Sin datos', null);
      expect(result.data).toBeNull();
    });
  });
});
