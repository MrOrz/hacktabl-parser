export class ColGroup {
  constructor(title, isLeaf = false) {
    this.title = title;
    if(!isLeaf){
      this.children = [];
    }
  }
};

export class RowGroup {
  constructor(title, cells) {
    this.title = title;
    if(cells) {
      this.cells = cells;
    } else {
      this.children = [];
    }
  }
};
