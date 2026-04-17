import BaseRepository from "./BaseRepository.js";

const mapFromDb = (row) => ({
  id: row.id,
  name: row.name,
  // Legacy support
  id_Priority: row.id,
});

const mapToDb = (entity) => ({
  name: entity.name,
});

class PriorityRepository extends BaseRepository {
  constructor() {
    super("priorities", {
      primaryKey: "id",
      mapFromDb,
      mapToDb,
    });
  }
}

export default PriorityRepository;
