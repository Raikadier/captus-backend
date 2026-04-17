class ProjectMember {
  constructor({
    id_ProjectMember = null,
    id_User,
    id_Project,
    id_Rol,
  }) {
    this.id_ProjectMember = id_ProjectMember;
    this.id_User = id_User;        
    this.id_Project = id_Project; 
    this.id_Rol = id_Rol;         
  }
}

export default ProjectMember;
