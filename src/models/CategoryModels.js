class Category {
  constructor({
    id_Category = null,
    name,
    id_User = null,
  }) {
    this.id_Category = id_Category;
    this.name = name;               
    this.id_User = id_User;         
  }
}

export default Category;
