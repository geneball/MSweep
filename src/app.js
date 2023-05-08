
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
		
		this.gui.addButton('Safe', ()=>this.randSafeClick())
		this.gui.addButton('Reset', ()=>this.resetField())
		this.gui.addNumber( 'Pct_cleared:', 0 )
		this.opt = this.gui.addGroup('Options','Opt', true)
		this.opt.addNumber('X', 20 )
		this.opt.addNumber('Y', 20 )
		this.opt.addNumber('Density', 20 )
		this.dbg = this.opt.addGroup('Debug','Dbg', true)
		this.dbg.addNumber( 'Possible_to_clear:', 0 )
		this.dbg.addNumber( 'Successfully_cleared:', 0 )
		this.dbg.addNumber( 'Exploded:', 0 )
		this.dbg.addNumber( 'Bombed:', 0 )
		this.dbg.addButton('Colors', ()=>this.chooseColor())
		
		//this.sbar.addFile( 'Disk:', '.dsk', this.getDsk.bind(this) )
		//this.sbar.addSelector('', App.extList, (val)=>{ this.chooseExt(val) })
		
	//	this.updSw()
		// color formatting
		HUI.gEl('b19').checked = true
		HUI.gEl('t09').checked = true
		HUI.gEl('e09').checked = true
		this.setFmt()		
		
		this.resetField()
		this.dbg.setVal( 'Possible_to_clear:', this.possible )
	
		HUI.addListener('data', 'contextmenu', (evt)=>evt.preventDefault() )
		HUI.addListener('data', 'mouseup', (evt)=>{ this.gridClick( evt ) })
	}
	gID( y, x ){
		if ( y<0 || y>=this.YSize ) return null
		if ( x<0 || x>=this.XSize ) return null
		return 'm' + y.toString().padStart(2,'0') + x.toString().padStart(2,'0')
	}
	resetField(){
		this.fillField( this.opt.getVal('X'),this.opt.getVal('Y'), this.opt.getVal('Density')/100 )
	}
	fillField( xc, yc, pct ){
		this.XSize = xc
		this.YSize = yc
		
		let vals = [ '*',     '',   '1',   '2',   '3',   '4',   '5',   '6',  '7',    '8' ]
		let cls = [ 'tm', 't0','t1','t2','t3','t4','t5','t6','t7','t8' ] 
		//'t19', 't06', 't03', 't00', 't07', 't01', 't08', 't04', 't09' ]
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
		this.possible = 0
		this.cleared = 0
		this.exploded = 0
		this.bombed = 0
		for (let y=0; y<yc; y++){
			for (let x=0; x<xc; x++){
				let idx = grid[y][x]+1
				let id = this.gID(y,x)
				if ( grid[y][x]>=0 ) 
					this.possible++
				if (grid[y][x]==0) 
					blanks.push( [ y,x] )	
				html += `<span id="${id}" class="grd sec"> ${vals[idx]} </span>`
			} 
			html += '<br>';
		}
		HUI.gEl('data').innerHTML = html;
	}
	clearCell( y,x, safe ){	
		let id = this.gID(y,x)
		let g = this.grid[y][x]
		if (!HUI.hasClass(id, 'sec')) debugger
		HUI.setClass( id, 'sec', false )
		HUI.setClass( id, 'cleared', true )
		if (!safe)
			this.cleared++
		HUI.setClass( id, g<0? 'tm' : `t${g}`, true )	
	}
	explodeCell( y, x ){
		let id = this.gID(y,x)
		if (!HUI.hasClass(id, 'sec')) debugger
		HUI.setClass( id, 'sec', false )
		HUI.setClass( id, 'exploded', true )
		this.exploded++
		this.gui.setVal( 'Exploded:', this.exploded )
	}
	bombCell( y, x ){
		let id = this.gID(y,x)
		if (!HUI.hasClass(id, 'sec')) debugger
		HUI.setClass( id, 'sec', false )
		HUI.setClass( id, 'bombed', true )
		this.bombed++
		this.gui.setVal( 'Bombed:', this.bombed )
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
			HUI.setClass( this.gID(y,x), 'mark' ); //right click
			HUI.setClass( this.gID(y,x), 'sec' ); 
			evt.preventDefault()
		} else
			this.doGridClick( y, x, false )
	}
	doGridClick( y, x, safe ){
		let cid = this.gID(y,x)
		if ( !HUI.hasClass( cid, 'sec' )) return
		
		if ( this.grid[y][x] < 0 ){	//detonate mine
			this.explodeStep( y,x )
			return
		}
		
		this.clearCell( y, x, safe )
		if ( this.grid[y][x]==0){  // auto-spread clearing
			this.spreadClear( y,x, safe )
		}
		this.gui.setVal('Successfully_cleared:', this.cleared )
		this.gui.setVal('Pct_cleared:', Math.round(this.cleared*100/this.possible) )
	}
	spreadClear( y,x, safe ){
		let todo = this.neighbors(y,x); 
		while (todo.length>0){
			let [y2,x2] = todo.pop()
			let id = this.gID(y2,x2)
			if ( this.grid[y2][x2]>=0 && HUI.gEl(id).classList.contains('sec') ){
				this.clearCell(y2,x2, safe)
				if (this.grid[y2][x2]==0){
					let nbrs = this.neighbors( y2, x2 )
					todo = todo.concat( nbrs )
				}
			}
		}
	}
	explodeStep( y,x ){
		let id = this.gID(y, x)
		if ( HUI.hasClass( id, 'exploded' )) return
		
		HUI.setClass( id, `exploding`, true )
		this.explodeCell(y,x)
		let nbrs = this.neighbors( y, x )
		for ( let [y2, x2] of nbrs ){
			let id2 = this.gID(y2,x2)
			if ( id2!=null && HUI.hasClass( id2, 'sec' )){
				let g = this.grid[y2][x2]
				if ( !HUI.hasClass(id2, 'mark') || g>=0 ){
					if ( g < 0 ){
						setTimeout( this.explodeStep.bind(this, y2,x2), 300 )
					} else
						this.bombCell( y2,x2 )
				}
			}
		}
		setTimeout( HUI.setClass( id, 'exploding', false ), 2500 )
	}
	randSafeClick(){	// click a random blank cell
		while (true){
			let r = Math.floor( Math.random() * this.blanks.length )
			let [y,x] = this.blanks[r]
			this.blanks.splice( r, 1 )
			if ( HUI.hasClass( this.gID(y,x), 'sec' )){
				this.doGridClick( y, x, true )
				return
			}
		}
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
var jsApp = new App( 'ClearField gb53 May2023' )
