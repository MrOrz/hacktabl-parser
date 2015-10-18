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

export class Paragraph {
  constructor(level = -1) {
    this.level = level; // -1: normal text, not inside any list
    this.children = []; // Mixed with runs and hyperlinks
  }
};

export class HyperLink {
  constructor(href) {
    this.href = href;
    this.children = []; // runs
  }
};

export class Run {
  constructor(config) {
    this.commentIds = config.commentIds || [];
    this.text = config.text || '';
    this.isB = config.isB || false; // bold
    this.isU = config.isU || false; // underlined
    this.isI = config.isI || false; // italic
  }
}