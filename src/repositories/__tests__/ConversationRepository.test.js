import { jest } from '@jest/globals';

jest.unstable_mockModule('../BaseRepository.js', () => {
  return {
    default: class BaseRepository {
      constructor(tableName, config) {
        this.tableName = tableName;
        this.client = {
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lt: jest.fn().mockReturnThis(),
          single: jest.fn(),
          order: jest.fn().mockReturnThis(),
        };
        this.mapFromDb = config.mapFromDb;
        this.mapToDb = config.mapToDb;
      }

      async save(entity) {
         return this.mapFromDb({ id: 1, ...this.mapToDb(entity) });
      }
    }
  };
});

const { default: ConversationRepository } = await import('../ConversationRepository.js');

describe('ConversationRepository', () => {
  let repo;

  beforeEach(() => {
    repo = new ConversationRepository();
    jest.clearAllMocks();
  });

  test('deleteOldConversations should delete conversations older than 24 hours', async () => {
    const userId = 'user-123';
    await repo.deleteOldConversations(userId);

    expect(repo.client.from).toHaveBeenCalledWith('conversations');
    expect(repo.client.delete).toHaveBeenCalled();
    expect(repo.client.eq).toHaveBeenCalledWith('user_id', userId);
    expect(repo.client.lt).toHaveBeenCalledWith('created_at', expect.any(String));
  });

  test('getRecentByUserId should call deleteOldConversations first', async () => {
    const userId = 'user-123';
    const spyDelete = jest.spyOn(repo, 'deleteOldConversations');

    repo.client.order.mockResolvedValue({ data: [], error: null });

    await repo.getRecentByUserId(userId);

    expect(spyDelete).toHaveBeenCalledWith(userId);
    expect(repo.client.select).toHaveBeenCalledWith('*');
  });
});
