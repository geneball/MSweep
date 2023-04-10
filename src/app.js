
	import { err, msg, statusMsg, question } 				from './msg.js'
	import { HUI, GUI } 									from './htmlui.js'
	import './gb53.css'
	import { ADsk } 										from './adsk.js'
	import { AltoInstr, AltoRun, AltoSyms } 				from './altoinst.js'
	import { DataClassifier } 								from './classifier.js'
	import { asBStr, asTxt, asChrs, padSpc, O, H, I  } 		from './fmt.js'
	
export class App {

	static SW = { pad: false, hex: false, oct: false, chrs: false, txt: false, code: false }
	static SWNames = [ 'pad', 'hex', 'oct', 'chrs', 'txt', 'code' ]
	static SWBinary = { pad: false, hex: true, oct: false, chrs: true, txt: false, code: false }
	static SWText =    { pad: false, hex: false, oct: false, chrs: false, txt: true, code: false }
	static displayFmts = {
		'RUN.':	App.SWBinary,
		'D.': 	App.SWText,
		'BT.': 	App.SWText,
		'BS.': 	App.SWText,
		'BCPL.': App.SWText
	}
	static extList = [ '', '.RUN.', '.SYMS.' ]
	static fileExt = ''
	
	static currApp
	
	static Refresh(){
		if ( App.currApp != undefined )
			App.currApp.refreshData()
	}

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

		for (let sw of App.SWNames )
			this.gui.addCheckbox( sw, ()=>{ this.updSw() } )

		this.gui.addButton( 'Colors', ()=> { this.chooseColor() })
		this.gui.addText( 'FID', '001a', this.showDisk.bind(this) ) 
		this.gui.addText( 'pg', '1', this.showDisk.bind(this) ) 
		this.gui.addButton( 'showDisk', this.showDisk.bind(this) ) 
		addEventListener("resize", this.showDisk.bind(this) );
		
		this.filecnt = 0
		this.openfiles = {}
		
		this.sbar = new GUI( 'sideBar', 'sb', '>' )
		this.sbar.addFile( 'Disk:', '.dsk', this.getDsk.bind(this) )
		this.sbar.addSelector('', App.extList, (val)=>{ this.chooseExt(val) })
		
		this.updSw()
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

	refreshData(){
		HUI.gEl('data').innerHTML = this.showFileData(  )
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
	getDsk( files ){
		if (files[0]==undefined) return
		let nm = files[0].name
		msg( `loading ${nm}...` )
		this.sbar.setVal('Disk:', `Disk: ${nm}` )
		this.sbar.addButton( '+File', ()=>this.showDisk() )
		this.disk = new ADsk( files[0], ()=>{ this.showDisk()} )
	}
	showDisk(){
		if (this.disk==undefined) return
		if ( this.fileselector == undefined ){
			App.fileList = this.disk.fileNames()
			App.fileList.sort()
			this.chooseExt( App.fileExt )
			
			this.fileselector = this.sbar.addSelector('', App.selFiles, (val)=>{ 
				let el = HUI.gEl( this.fileselector )
				el.hidden=true
				//el.parentElement.innerText += val
				this.showFile( val ) 
			} )
			HUI.gEl('data').innerHTML = this.disk.showPages( 0, 0 )
		} else {
			let el = HUI.gEl( this.fileselector )
			el.hidden = false
			let fid = this.gui.getVal('FID')
			let pg = this.gui.getVal('pg')
			HUI.gEl('data').innerHTML = this.disk.showPages( fid, parseInt(pg) )
		}
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
	showFile( fnm ){ 		// called once on file selection
		if ( this.disk == undefined ) return
		
		for (let f of Object.values( this.openfiles ))
			f.filegrp.setHidden(true)
		
		let cf =  { nm: fnm, idx: this.filecnt++ }
		this.openfiles[fnm] = this.currfile = cf
		let fidx = `file${cf.idx}`
		
		cf.filegrp = this.sbar.resetGroup( cf.filegrp, fidx, fnm, false, ()=>{ this.selFile(cf) } ) 

		
		let f = this.disk.fileInfo( fnm )
		let descr = this.disk.checkFile( fnm )
		HUI.gEl('data').innerHTML = ` ${descr} <br> fid: ${f.fid} <br>`
				
		cf.pgbtns = cf.filegrp.resetGroup( cf.pgbtns, 'pb', 'PgBtns', true )
		for ( let i=0; i<f.npages; i++ ){
			cf.pgbtns.addButton( `${i}`, ()=>this.showPage( f.pgs[i] ) )
		}
		this.setDisplayFmt( cf )
		this.refreshData( )
	}
	showPage( vda ){
		let pg = this.disk.diskPage( vda )
		
		let txt = `<pre> Pg${vda}=${H(vda)}:  <br>`
		txt += `  fid: ${pg.fid}  filepage: ${pg.filepage} nbytes: ${pg.nbytes} <br>`
		txt += `  nxtRDA:${H(pg.nextRDA)} vda:${H(this.disk.RDAtoVDA(pg.nextRDA))} <br>`
		txt += `  prvRDA:${H(pg.prevRDA)} vda:${H(this.disk.RDAtoVDA(pg.prevRDA))} <br>`
		txt += `  isFreePg:${pg.isFreePg} isFilePg: ${pg.isFilePg} isDirPg: ${pg.isDirPg} <br>`
		txt += `  pagenum:${pg.pagenum} hdr: ${H(pg.hdr[0])}${H(pg.hdr[1])} <br></pre>`
		HUI.gEl('data').innerHTML = txt
		
		let cls = new DataClassifier( 'diskPg', pg.data, this.sbar )
		HUI.gEl('data').innerHTML += cls.showData( pg.data, App.SWBinary, App.dataWidth )
	}
	showFileData( ){
		if ( !this.disk || !this.currfile ) return ''
		let cf = this.currfile
		cf.filedata = this.disk.fileData( cf.nm )
		let ext = cf.nm.substring( cf.nm.indexOf('.') )
		if ( ext.toUpperCase()=='.RUN.' ){
			if ( cf.Run==undefined ){
				cf.runGroup = cf.filegrp.resetGroup( cf.runGroup, 'run', '.run:', false )
				cf.runGroup.addCheckbox( 'vbose', ()=>{ cf.Run.tglVerbose() } )
				cf.runGroup.addBreak()
				cf.classifier = new DataClassifier( 'run', cf.filedata, cf.runGroup )
				
				cf.Run = new AltoRun( cf.nm, cf.classifier )
			}
		} else	if ( ext.toUpperCase()=='.SYMS.' ){
			if ( cf.Syms==undefined ){
				cf.symsGroup = cf.filegrp.resetGroup( cf.symsGroup, 'syms', '.syms:', false )
				cf.symsGroup.addCheckbox( 'vbose', ()=>{ cf.Syms.tglVerbose() } )
				cf.classifier = new DataClassifier( 'sym', cf.filedata, cf.symsGroup )
				cf.symsGroup.addBreak()
				
				cf.Syms = new AltoSyms( cf.nm, cf.classifier )
			}
		} else
			cf.classifier = new DataClassifier( ext, cf.filedata, cf.filegrp )

		return cf.nm + ':<br>' + cf.classifier.showData( cf.filedata, App.SW, App.dataWidth )
	}
	addMsg( s ){
		this.sbar.addLine( '', s )
	}
}
var jsApp = new App( 'AltoDecode gb53 Apr2023' )
