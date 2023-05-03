
	import { err, msg, statusMsg, question } 				from './msg.js'
	import { HUI, GUI } 									from './htmlui.js'
	import './gb53.css'
	import { saveAs } 										from 'file-saver'
	
export class App {


	constructor( title ){
		let el = HUI.gEl('title')
		if (el) el.innerText = title
		msg( title )
		
		App.currApp = this
		
		this.gui = new GUI( 'header', 'hdr', '_' )
		// this.gui.addText( 'Find:', '', (val)=>{ fnm = val } )
		// this.gui.addButton( 'showDisk', ()=> { this.showDisk()  } )
		// this.gui.addFile( 'OctalText:', '', this.getOct.bind(this) )
		// this.gui.addButton( 'Prev', ()=> { App.dumpAddr -= App.dumpStep })
		// this.gui.addText( 'Loc:', '0', (addr) => { App.dumpAddr = parseInt( addr, 8) } )
		// this.gui.addButton( 'Next', ()=> { App.dumpAddr += App.dumpStep })

		//this.sbar = new GUI( 'sideBar', 'sb', '>' )
		this.gui.addNumber('X', 20 )
		this.gui.addNumber('Y', 20 )
		this.gui.addNumber('Pct', 20 )
		this.gui.addButton('Safe', ()=>this.randSafeClick())
		this.gui.addButton('Reset', ()=>this.resetField())
		this.gui.addButton('Colors', ()=>this.chooseColor())
		//this.sbar.addFile( 'Disk:', '.dsk', this.getDsk.bind(this) )
		//this.sbar.addSelector('', App.extList, (val)=>{ this.chooseExt(val) })
		
	//	this.updSw()
		// color formatting
		HUI.gEl('b19').checked = true
		HUI.gEl('t09').checked = true
		HUI.gEl('e09').checked = true
		this.setFmt()		
		
		this.resetField()
		HUI.addListener('data', 'mouseup', (evt)=>{ this.gridClick( evt ) })
	}
	gID( y, x ){
		return 'm' + y.toString().padStart(2,'0') + x.toString().padStart(2,'0')
	}
	resetField(){
		this.fillField( this.gui.getVal('X'),this.gui.getVal('Y'), this.gui.getVal('Pct')/100 )
	}
	fillField( xc, yc, pct ){
		this.XSize = xc
		this.YSize = yc
		
		let vals = [ '*',     '',   '1',   '2',   '3',   '4',   '5',   '6',  '7',    '8' ]
		let cls = [ 'b00', 't19', 't06', 't03', 't00', 't07', 't01', 't08', 't04', 't09' ]
		let grid = [] 
		let blanks = this.blanks = []
		this.grid = grid
		grid[-1]= []
		grid[yc]= []
		for (let y=0; y<yc; y++){
			grid[y] = []
			for (let x=0; x<xc; x++){
				grid[y][x] = Math.random() < pct? -1 : 0
			}
		}
		for (let y=0; y<yc; y++)
			for (let x=0; x<xc; x++)
				if (grid[y][x] >= 0){
					for (let ny=y-1; ny<y+2; ny++)
						for (let nx=x-1; nx<x+2; nx++){
							console.log( `[${y},${x}] [${ny},${nx}]=${grid[ny][nx]}` )
							if ( grid[ny][nx] == -1 )
								grid[y][x]++;
						}
				}
		let html = ''
		for (let y=0; y<yc; y++){
			for (let x=0; x<xc; x++){
				let idx = grid[y][x]+1
				let id = this.gID(y,x)
				if (grid[y][x]==0) blanks.push( [ y,x] )	
				html += `<span id="${id}" class="grd sec ${cls[idx]}"> ${vals[idx]} </span>`
			} 
			html += '<br>';
		}
		HUI.gEl('data').innerHTML = html;
	}
	neighbors( y, x ){
		y = Number(y)
		x = Number(x)
		return [ [y-1,x-1], [y,x-1], [y+1,x-1], [y-1,x],[y+1,x], [y-1,x+1],[y,x+1],[y+1,x+1] ]
	}
	gridClick( evt ) {
		let tgt = evt.target;
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		if (evt.button!=0){  
			HUI.setClass( this.gID(y,x), 'mark' ); //scroll wheel
		} else
			this.doGridClick( y, x )
	}
	doGridClick( y, x ){
		HUI.setClass( this.gID(y,x), 'sec', false );
		if ( this.grid[y][x]==0){
			let todo = this.neighbors(y,x); 
			while (todo.length>0){
				let [y2,x2] = todo.pop()
				let id = this.gID(y2,x2)
				if ( this.grid[y2][x2]>=0 && HUI.gEl(id).classList.contains('sec') ){
					HUI.setClass( id, 'sec', false )
					if (this.grid[y2][x2]==0){
						let nbrs = this.neighbors( y2, x2 )
						todo = todo.concat( nbrs )
					}
				}
			}
		} else if ( this.grid[y][x]<0 ){	//lost!
			for (let y2=0; y2<this.YSize; y2++)
				for (let x2=0; x2<this.XSize; x2++){
					let id = this.gID(y2,x2)
					if ( HUI.hasClass(id, 'mark'))
						HUI.setClass(id, this.grid[y2][x2] >= 0? 'wrong':'right', true );
					HUI.setClass( id, 'sec', false )
				}
		}
	}
	randSafeClick(){
		let r = Math.floor( Math.random() * this.blanks.length )
		let [y,x] = this.blanks[r]
		this.doGridClick( y, x )
		// while (true){	
			// let rx = Math.floor( Math.random() * this.XSize)
			// let ry = Math.floor( Math.random() * this.YSize)
			// if ( this.grid[ry][rx]>=0 ){
				// this.doGridClick( ry, rx )
				// return
			// }
		// }
	}
	chooseExt( val ){
		App.fileExt = val=='*'? '' : val
		if ( App.fileList == undefined ) return
		if ( App.fileExt == '' ){ 
			App.selFiles = App.fileList
			return
		}
		App.selFiles = []
		for ( let f of App.fileList ){
			if ( f.toUpperCase().endsWith( App.fileExt ))
				App.selFiles.push( f )
		}
		if ( this.fileselector !=undefined ){
			HUI.loadSelect( this.fileselector, App.selFiles )
		}
	}
	chooseColor(){
		let csel = HUI.gEl('colorSel')
		csel.hidden = false
		HUI.addListener('colorSel', 'change', (evt)=>{ this.setFmt( evt ) })
		HUI.addListener('selFmt', 'click', (evt)=>{ this.selectFmt( evt ) })
	}
	selectFmt( evt ){
		HUI.gEl('colorSel').hidden = true
	}
	setFmt( ){
		let clses = ''
		let bkgs = document.getElementsByName('bkgfmt')
		for ( let i=0; i<bkgs.length; i++ )
			if (bkgs[i].checked) clses += bkgs[i].id + ' '
		let txts = document.getElementsByName('txtfmt')
		for ( let i=0; i<bkgs.length; i++ )
			if (txts[i].checked) clses += txts[i].id + ' '
		let boxs = document.getElementsByName('boxfmt')
		for ( let i=0; i<bkgs.length; i++ )
			if (boxs[i].checked) clses += boxs[i].id + ' '

		HUI.gEl('fmtexample').className = clses
	}

	setDisplayFmt( cf ){
		if ( cf.displayfmt == undefined ){
			let ext = cf.nm.substring( cf.nm.indexOf('.')+1 ).toUpperCase()
			cf.displayfmt = App.displayFmts[ ext ]
			if ( cf.displayfmt == undefined )
				cf.displayfmt = App.SWBinary
		}
		App.SW = cf.displayfmt
		for ( let sw of App.SWNames )
			this.gui.setVal( sw, App.SW[sw] )
		padSpc( App.SW.pad )
	}
	updSw(){
		let scrwd = HUI.gEl('data').clientWidth
		let charpix = (HUI.gEl('Test').clientWidth / 52)
		App.dataWidth = Math.trunc( scrwd / charpix )
		
		App.SW.pad = this.gui.getVal('pad')
		padSpc( App.SW.pad )
		App.SW.hex = this.gui.getVal('hex')
		App.SW.oct = this.gui.getVal('oct')
		App.SW.chrs = this.gui.getVal('chrs')
		App.SW.txt = this.gui.getVal('txt')
		App.SW.code = this.gui.getVal('code')
		
		this.refreshData()
	}
	getOct( files ){
		msg( `loading ${files[0].name}...` )
		files[0].text().then( (txt) => {
			//let siz = txt.length/4
			txt = txt.replace(/[\t\r]/g, ' ')
			this.data = []
			let lns = txt.split('\n')
			let a = 0
			for (let i=0; i<lns.length; i++){
				let [ num, vals ] = lns[i].split(':')
				vals = vals.trim().split(' ')
				num = parseInt(num, 8)
				if ( this.data.length != num ) debugger
				for (let j=0; j<vals.length; j++){ 
					//if ( a == this.data.length ) 
					//	this.data.resize(a+1)
					let t = vals[j].trim()
					if ( t != '' )
						this.data.push( parseInt( t, 8 ))
				}
			}
			HUI.gEl('data').innerHTML = this.showData()
		})
	}
	selFile( cf ){
		for (let f of Object.values( this.openfiles )){
			if ( f != cf )
				f.filegrp.setHidden( true )
		}
		msg( `open ${cf.nm}` )
		this.currfile = cf
		this.setDisplayFmt( cf )
		this.refreshData()
	}
	svCFile(){
		let cf = this.currfile
		let fnm = cf.nm.substring(0,cf.nm.indexOf('.')) + '.c'
		let txt = cf.Run.asCFile( fnm, cf.runGroup.getVal('vbose'))
		let blob = new Blob( [txt], {type: "text/plain;charset=utf-8"} )
		saveAs( blob, fnm )
	}
	addMsg( s ){
		this.gui.addLine( '', s )
	}
}
var jsApp = new App( 'MSweep gb53 Apr2023' )
