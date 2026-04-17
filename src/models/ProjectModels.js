class Project {
  constructor({
    id_Project = null,
    name,
    description = null,
    createdAt = new Date(),
    id_Creator,
  }) {
    this.id_Project = id_Project;
    this.name = name;
    this.description = description;
    this.createdAt = createdAt;
    this.id_Creator = id_Creator; // FK hacia User.id_User
  }
}

export default Project;
