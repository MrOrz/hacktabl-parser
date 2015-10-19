export class ColGroup {
  constructor(paragraphs, isLeaf = false) {
    this.paragraphs = paragraphs;
    if(!isLeaf){
      this.children = []; // nested ColGroups
    }
  }
};

export class RowGroup {
  constructor(paragraphs, colspan = 1, isLeaf = false) {
    this.paragraphs = paragraphs;
    this.colspan = colspan;
    if(isLeaf) {
      this.cells = [];
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

export class DataCell {
  constructor() {
    this.summaryParagraphs = [];
    this.items = [];
  }

  addItem(paragraph, ref = [], labels = []) {
    this.items.push({
      level: paragraph.level,
      children: paragraph.children, // Mixed with runs and hyperlinks
      labels, // Array of label text
      ref,    // Mixed with runs and hyperlinks
    });
  }
}
