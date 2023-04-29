
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

		this.sbar = new GUI( 'sideBar', 'sb', '>' )
		this.sbar.addFile( 'Disk:', '.dsk', this.getDsk.bind(this) )
		this.sbar.addSelector('', App.extList, (val)=>{ this.chooseExt(val) })
		
	//	this.updSw()
		// color formatting
		HUI.gEl('b19').checked = true
		HUI.gEl('t09').checked = true
		HUI.gEl('e09').checked = true
		this.setFmt()		
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
		this.sbar.addLine( '', s )
	}
}
var jsApp = new App( 'App js template gb53 Apr2023' )
