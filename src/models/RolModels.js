class Rol {
  constructor({
    id_Rol = null,
    name,
    description = null,
  }) {
    this.id_Rol = id_Rol;
    this.name = name;
    this.description = description;
  }
}

export default Rol;
