export class ColGroup {
  constructor(paragraphs, isLeaf = false) {
    this.paragraphs = paragraphs;
    if(!isLeaf){
      this.children = []; // nested ColGroups
    }
  }
};

export class RowGroup {
  constructor(paragraphs, cells) {
    this.paragraphs = paragraphs;
    if(cells) {
      this.cells = cells;
    } else {
      this.children = []; // nested RowGroups
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
    this.runs = []; // runs
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