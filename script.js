DataView.prototype.getUint64 = function (byteOffset, littleEndian) {
  // split 64-bit number into two 32-bit (4-byte) parts
  const left = this.getUint32(byteOffset, littleEndian);
  const right = this.getUint32(byteOffset + 4, littleEndian);

  // combine the two 32-bit values
  const combined = littleEndian ? left + 2 ** 32 * right : 2 ** 32 * left + right;

  if (!Number.isSafeInteger(combined)) {
    console.warn(combined, 'exceeds MAX_SAFE_INTEGER. Precision may be lost');
  }

  return combined;
};

const vm = new Vue({
  el: '#app',
  created() {
    document.addEventListener('drag', this.handleDrag);
    document.addEventListener('dragstart', this.handleDrag);
    document.addEventListener('dragenter', this.handleDrag);
    document.addEventListener('dragexit', this.handleDrag);
    document.addEventListener('dragend', this.handleDrag);
    document.addEventListener('dragleave', this.handleDrag);
    document.addEventListener('dragover', this.handleDrag);
    document.addEventListener('drop', this.handleDrag);

    document.addEventListener('keydown', this.handleKey);

    document.addEventListener('wheel', this.handleWheel);

    window.addEventListener('resize', this.handleResize);
  },
  methods: {
    getRows(fn) {
      if (!this.dataView) {
        return [];
      }
      const rows = [];
      for (let row = this.row.start; row < this.row.start + this.rows; row++) {
        const values = [];
        for (let column = 0; column < this.rowLength; column++) {
          const offset = row * this.rowLength + column;
          const value = offset < this.dataView.byteLength ? this.dataView.getUint8(offset) : '  ';
          values.push(fn(value));
        }
        rows.push(values);
      }
      return rows;
    },
    updateColumnToLine() {
      const offset = this.row.current * this.rowLength + this.column;
      if (offset >= this.dataView.byteLength) {
        this.column = this.dataView.byteLength % this.rowLength - 1;
      }
    },
    moveCharLeft() {
      this.column = Math.max(0, this.column - 1);
      this.updateInterpreter();
    },
    moveCharRight() {
      const newColumn = Math.min(this.rowLength - 1, this.column + 1);
      const offset = this.row.current * this.rowLength + newColumn;
      if (offset < this.dataView.byteLength) {
        this.column = newColumn;
      }
      this.updateInterpreter();
    },
    moveLineUp() {
      this.row.current = Math.max(0, this.row.current - 1);
      if (this.row.current < this.row.start) {
        this.row.start = this.row.current;
      }
      this.updateColumnToLine();
      this.updateInterpreter();
    },
    moveLineDown() {
      this.row.current = Math.min(this.maxRows, this.row.current + 1);
      if (this.row.current > this.row.start + (this.rows - 1)) {
        this.row.start = this.row.current - (this.rows - 1);
      }
      this.updateColumnToLine();
      this.updateInterpreter();
    },
    movePageUp() {
      this.row.start = Math.max(0, this.row.start - this.rows);
      this.row.current = this.row.start;
      this.updateColumnToLine();
      this.updateInterpreter();
    },
    movePageDown() {
      this.row.start = Math.min(this.maxStartRow, this.row.start + this.rows);
      this.row.current = this.row.start;
      this.updateColumnToLine();
      this.updateInterpreter();
    },
    moveToStart() {
      this.row.current = this.row.start = 0;
    },
    moveToEnd() {
      this.row.start = this.maxStartRow;
      this.row.current = this.maxRows;
    },
    goToChar(charIndex) {
      this.column = charIndex;
    },
    goToLineRelative(lineIndex) {
      this.row.current = this.row.start + lineIndex;
    },
    isValueActive(lineIndex, valueIndex) {
      if (!this.isLineActive(lineIndex)) {
        return false;
      }
      return valueIndex === this.column;
    },
    isLineActive(lineIndex) {
      return lineIndex === this.row.current - this.row.start;
    },
    updateInterpreter() {
      this.interpreter.u8 = this.dataView.getUint8(this.offset);
      this.interpreter.i8 = this.dataView.getInt8(this.offset);

      this.interpreter.u16le = this.dataView.getUint16(this.offset, true);
      this.interpreter.i16le = this.dataView.getInt16(this.offset, true);
      this.interpreter.u16be = this.dataView.getUint16(this.offset, false);
      this.interpreter.i16be = this.dataView.getInt16(this.offset, false);

      this.interpreter.u32le = this.dataView.getUint32(this.offset, true);
      this.interpreter.i32le = this.dataView.getInt32(this.offset, true);
      this.interpreter.u32be = this.dataView.getUint32(this.offset, false);
      this.interpreter.i32be = this.dataView.getInt32(this.offset, false);

      this.interpreter.f32le = this.dataView.getFloat32(this.offset, true);
      this.interpreter.f32be = this.dataView.getFloat32(this.offset, true);

      this.interpreter.f64le = this.dataView.getFloat64(this.offset, true);
      this.interpreter.f64be = this.dataView.getFloat64(this.offset, true);

      this.interpreter.tu32le = new Date(this.dataView.getUint32(this.offset, true));
      this.interpreter.tu32be = new Date(this.dataView.getUint32(this.offset, false));

      this.interpreter.tf32le = new Date(this.dataView.getFloat32(this.offset, true));
      this.interpreter.tf32be = new Date(this.dataView.getFloat32(this.offset, false));
      this.interpreter.tf64le = new Date(this.dataView.getFloat64(this.offset, true));
      this.interpreter.tf64be = new Date(this.dataView.getFloat64(this.offset, false));
    },
    loadFile(file) {
      const fr = new FileReader();
      fr.addEventListener('load', this.handleFile);
      fr.addEventListener('error', this.handleFile);
      fr.readAsArrayBuffer(file);
    },
    handlePalette(e) {
      const files = e.target.files;
      const [file] = files;
      //this.loadPalette(file)
    },
    handleOpenFile(e) {
      const files = e.target.files;
      const [file] = files;
      this.loadFile(file);
    },
    handleValueClick(valueIndex, e) {
      this.goToChar(valueIndex);
    },
    handleLineClick(lineIndex, e) {
      this.goToLineRelative(lineIndex);
    },
    handleResize(e) {
      console.log(e);
    },
    handleKey(e) {
      if (e.code === 'ArrowUp' || e.key === 'k') {
        this.moveLineUp();
      } else if (e.code === 'ArrowDown' || e.key === 'j') {
        this.moveLineDown();
      }

      if (e.code === 'ArrowLeft' || e.key === 'h') {
        this.moveCharLeft();
      } else if (e.code === 'ArrowRight' || e.key === 'l') {
        this.moveCharRight();
      }

      if (e.code === 'PageUp') {
        this.movePageUp();
      } else if (e.code === 'PageDown') {
        this.movePageDown();
      }

      if (e.key === 'g') {
        this.moveToStart();
      } else if (e.key === 'G') {
        this.moveToEnd();
      }
    },
    handleWheel(e) {
      if (e.deltaY < 0) {
        this.moveLineUp();
      } else {
        this.moveLineDown();
      }
    },
    handleFile(e) {
      const fr = e.target;
      const arrayBuffer = fr.result;
      fr.removeEventListener('load', this.handleFile);
      fr.removeEventListener('error', this.handleFile);
      this.dataView = new DataView(arrayBuffer);
      this.updateInterpreter();
    },
    handleDrag(e) {
      if (e.type === 'dragover') {
        e.preventDefault();
      } else if (e.type === 'drop') {
        e.preventDefault();
        this.row.start = 0;
        this.row.current = 0;
        this.column = 0;
        const [file] = e.dataTransfer.files;
        this.loadFile(file);
      }
    } },

  data() {
    return {
      dataView: null,
      rowLength: 16,
      row: {
        start: 0,
        current: 0 },

      column: 0,
      settings: {
        le: true,
        be: true,
        u: true,
        i: true,
        colorize: {
          enabled: false,
          palette: null } },


      interpreter: {
        u8: 0,
        i8: 0,
        u16le: 0,
        i16le: 0,
        u16be: 0,
        i16be: 0,
        u32le: 0,
        i32le: 0,
        u32be: 0,
        i32be: 0,
        f32le: 0,
        f32be: 0,
        f64le: 0,
        f64be: 0,
        tu32le: 0,
        tu32be: 0,
        tf32le: 0,
        tf32be: 0,
        tf64le: 0,
        tf64be: 0,
        binary: 0,
        hex: 0 } };


  },
  computed: {
    size() {
      if (!this.dataView) {
        return 0;
      }
      return this.dataView.byteLength;
    },
    offset() {
      return this.row.current * this.rowLength + this.column;
    },
    maxStartRow() {
      return this.maxRows - (this.rows - 1);
    },
    maxRows() {
      if (!this.dataView) {
        return 0;
      }
      return Math.floor(this.dataView.byteLength / this.rowLength);
    },
    rows() {
      return Math.ceil(this.$el.clientHeight / 16); // NOTE: This is not the row length (it's the pixel height of each line)
    },
    offsets() {
      if (!this.dataView) {
        return [];
      }
      const rows = [];
      for (let row = this.row.start; row < this.row.start + this.rows; row++) {
        rows.push((row * this.rowLength).toString(16).padStart(8, '0'));
      }
      return rows;
    },
    hex() {
      return this.getRows(value => value.toString(16).padStart(2, '0').toUpperCase());
    },
    ascii() {
      return this.getRows(value => value >= 32 && value <= 127 ? String.fromCharCode(value) : '.');
    } } });