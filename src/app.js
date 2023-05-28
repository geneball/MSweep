
	import { err, msg, statusMsg, question } 				from './msg.js'
	import { HUI, GUI } 									from './htmlui.js'
	import './gb53.css'
	import { saveAs } 										from 'file-saver'
	import dayjs											from 'dayjs'
	import Rand, {PRNG} 									from 'rand-seed'
	
export class App {


	constructor( title ){
		this.title = title
		let el = HUI.gEl('title')
		if (el) el.innerText = this.title
		
		this.Version = '1.0_5/28/23'

		this.registerSW()
		
		let ng = Number( localStorage.getItem( 'nGames' ))
		if ( ng==undefined ) localStorage.setItem( 'nGames', 0 )
		this.UserName = localStorage.getItem( 'user' )
		
		App.currApp = this
		
		this.gui = new GUI( 'header', 'hdr', '_' )

		this.gui.addBreak()
		this.gui.addButton('Reset', ()=>this.selWinnable())
		this.gui.addValue('Mines:', `${this.mines} - ${this.exploded}E - ${this.marked}M` )
		this.gui.addButton('Safe', ()=>this.randSafeClick()) 
		this.gui.addButton('Hist', (evt)=>this.showGames(evt) ) 
		this.gui.addButton('Play', (evt)=>this.play( 10 ) ) 

		this.opt = this.gui.addGroup('Options','Opt', true)
		this.opt.addCheckbox( 'W' )
		this.opt.setVal( 'W', true )
		this.opt.addText( 'Game', '1', this.changeGame.bind(this) )
		this.opt.addNumber('X', 20 )
		this.opt.addNumber('Y', 20 )
		this.opt.addNumber('Density', 20 )
		this.opt.addText( 'Username', this.UserName, (val)=>{ this.UserName = val; localStorage.setItem( 'user', val ) } )

		this.det = this.gui.addGroup('Details','Det', true)
	//	this.gui.addBreak()
		this.det.addValue( 'Details:', 0 )
		this.dbg = this.det.addGroup('Debug','Dbg', true)
		this.dbg.addNumber( 'zm:', 0, this.updatePos.bind(this) )
		this.dbg.addNumber( 'dx:', 0, this.updatePos.bind(this) )
		this.dbg.addNumber( 'dy:', 0, this.updatePos.bind(this) )
		this.dbg.addButton( 'Colors', ()=>this.chooseColor())
		this.dbg.addButton( 'UnPlay', (evt)=>this.unplayLast(evt) ) 
		this.dbg.addButton( 'Eval', (evt)=>this.findWinnable() ) 
				
		this.maxunwinnable = 1107
		this.winnableGames = [
			'1-7', 		'7-14', 	'12-5', 	'32-11', 	'41-1', 	'45-3', 	'60-6', 	'82-3', 
			'115-1', 	'120-2', 	'128-5', 	'148-4', 	'161-9', 	'163-7', 	'185-6', 	'208-7',
			'223-1', 	'224-8', 	'242-3', 	'243-1', 	'260-1', 	'261-12', 	'271-1', 	'275-2',
			'285-1', 	'298-11', 	'300-1', 	'302-11',	'309-9', 	'328-1', 	'332-3', 	'344-2',
			'346-4', 	'370-1', 	'389-12', 	'396-8', 	'400-2', 	'401-6', 	'402-5', 	'409-1',
			'465-6',	'483-2',	'498-6', 	'500-1', 	'531-10', 	'539-5', 	'553-8', 	'569-5',
			'576-1',	'601-4', 	'624-6', 	'630-5', 	'659-1', 	'667-7', 	'694-4',	'722-1',
			'725-1', 	'741-10', 	'764-2', 	'767-1', 	'770-2', 	'773-8', 	'798-1', 	'722-1',
			'725-1', 	'741-10', 	'764-2', 	'767-1', 	'770-2', 	'773-8', 	'798-1',	'823-1',
			'827-10', 	'829-1', 	'847-8', 	'883-8', 	'896-3', 	'901-5', 	'902-8',	'912-7',
			'915-2', 	'917-3', 	'927-1', 	'931-7',	'960-7',	'968-2',	'970-2',	'977-4',
			'981-2',	'1004-1', 	'1012-5', 	'1027-9', 	'1033-9',	'1046-4',	'1060-2',	'1062-2',
			'1063-6',	'1077-11',	'1082-8',	'1088-1'
		]
		this.errCnt = 0
		this.resetApp()
	
		let tgt = HUI.gEl('lower')
		tgt.addEventListener( 'contextmenu', (evt)=>evt.preventDefault() )
		tgt.addEventListener( 'mouseup', (evt)=>{ this.gridClick( evt ) })
		
		tgt.addEventListener( 'touchstart', (evt)=>{ this.touchstart( evt )}, { passive: false } )
		tgt.addEventListener( 'touchend', (evt)=>{ this.touchend( evt )}, { passive: false } )
		tgt.addEventListener( 'touchmove', (evt)=>{ this.touchmove( evt )}, { passive: false } )
		document.addEventListener( 'keydown', (evt)=>{ this.keydown( evt )} )
		window.addEventListener( 'resize', (evt)=>{ this.resizeApp() } )
		document.addEventListener('click', (evt)=>{	HUI.setClass( 'Popup', 'hide', true ) })
	}
	rand(){
		if ( this.gameNum == 0 )
			return Math.random()
		else
			return this.randgen.next()
	}
	unplayLast(){
		while ( this.gamesteps.length > 0 ){
			let mv = this.gamesteps.pop()
			this.unplay( mv.y, mv.x )
			if ( mv.user ){
				this.selCell( mv.y, mv.x )
				return
			}
		}
	}
	findWinnable(){
		let gm = Number( this.maxunwinnable )
		let ln = this.winnableGames.length
		if (ln > 0) 
			gm = Number( this.winnableGames[ ln-1 ].split('-')[0] )
		if ( this.maxunwinnable > gm )
			gm = this.maxunwinnable
		
		for (let i=1; i<=100; i++)
			setTimeout( this.evalGame.bind( this, Number(gm)+i ), 5000 )		
	}
	
	evalGame( num ){
		if ( this.winnableGames == undefined ){
			this.winnableGames = []
		}
		this.opt.setVal( 'Game', num )
		this.resetApp()
		let maxSafe = 0
		while ( this.randSafeClick() ) maxSafe++
		
		let lowestwinnable = -1
		for ( let nRS = maxSafe; nRS >= 0; nRS-- ){
			this.opt.setVal('Game', `${num}-${nRS}` )
			this.resetApp()
			this.PlayTest = true
			this.play( 0 )
			this.PlayTest = false
			
			if ( this.secret == 0 ) 
				lowestwinnable = nRS
			
			if ( this.secret > 0 ) break   // found a non-winnable version
		}
		if ( lowestwinnable < 0 ){
			msg( `Game ${num}-${maxSafe} non-winnable`)
			this.maxunwinnable = num
			console.log( `maxunwinnable: ${this.maxunwinnable}` )
		} else {
			let wgm = `${num}-${lowestwinnable}`
			this.winnableGames.push( wgm )
			this.opt.setVal('Game', wgm )
			this.resetApp()
			console.log( `winnable: '${this.winnableGames[ this.winnableGames.length-1]}'` )
			msg( `Game ${wgm} is winnable` )
		}
	}
	play( dly ){
		if ( dly==undefined ) dly = 10
		this.toDo = []
		for (let y=0; y<this.YSize; y++)
			for (let x=0; x<this.XSize; x++){
				let id = this.gID( y, x )
				if ( HUI.hasClass(id, ['cleared','freed','exploded','bombed'] )){
					if ( this.grid[y][x] == 0 )
						this.markProcessed( y, x )
					else
						this.toDo.push( { y: y, x: x } )
				}
			}
			
		this.cntSinceChg = 0
		this.playStep( dly )
	}
	playStep( dly ){
		while ( this.toDo.length > 0 && this.cntSinceChg < this.toDo.length*3 ){
			let c = this.toDo.pop()
			let ev = this.evalCell( c )	// => null or { y: x: nmines: marked: secret:[] }
			
			if ( ev != null ){
				msg( `L${this.toDo.length} C${this.cntSinceChg} [${ev.y},${ev.x}] ${ev.nmines}M ${ev.marked}M ${ev.secret.length}S` )
				this.selCell( c.y, c.x )
				if ( this.playCell( ev )){
					this.cntSinceChg = 0
				} else {
					this.toDo.unshift( ev )
					this.cntSinceChg++
				}
				if ( dly > 0 )
					setTimeout( this.playStep.bind(this, dly ), dly )
				else
					this.playStep( dly )
				return
			}
		}
		msg( `Play stopped: L${this.toDo.length} C${this.cntSinceChg}` )
	}
	evalCell( cell ){
		let id = this.gID( cell.y, cell.x )
		if ( HUI.hasClass(id, ['secret', 'marked', 'exploded' ] )) return null

		// cell is either 'cleared', 'freed', or 'bombed'
		let adj = this.adjCells( cell.y, cell.x )
		let marked = 0
		let secNbrs = []
		for ( let n of adj ){
			let nid = this.gID( n.y, n.x )
			if ( HUI.hasClass( nid, 'secret' ))
				secNbrs.push( n )
			if ( HUI.hasClass( nid, 'marked' )) 
				marked++
		}
		if ( secNbrs.length==0 ){
			this.markProcessed( id )
			return null	// neighbors all marked or cleared
		}
		let nmines = this.grid[ cell.y ][ cell.x ]	// # of adjacent mines
		
		return { y: cell.y, x: cell.x, nmines: nmines, marked: marked, secret: secNbrs }
	}
	markProcessed( yOrId, x ){	// set as 'processed' to visually mark
		let id = x==undefined? yOrId : this.gID( yOrId, x )
		
		if ( HUI.hasClass( id, 'bombed' ))
			HUI.setClass( id, 'procbombed', true )
		else
			HUI.setClass( id, 'processed', true )
			
		HUI.setClass( id, ['cleared','freed','bombed','tm','t0','t1','t2','t3','t4','t5','t6','t7','t8'], false )
	}
	playCell( e ){
		if ( e.nmines < 0) debugger  // cleared mine!
		let secret = e.secret.length
		let nhidden = e.nmines - e.marked
		if ( nhidden > 0 && secret != nhidden ) 
			return false 		// not enough info yet
		
		this.markProcessed( e.y, e.x )
		for ( let n of e.secret ){
			let nid = this.gID( n.y, n.x )
			this.playChanged = true
			if ( nhidden==0 ){ // no unmarked mines -- clear all secret
				this.clearCell( n.y, n.x, false )
				this.toDo.push( { y: n.y, x: n.x } )
			} else 
				this.markCell( n.y, n.x )  // mark all secret cells
		}
		return true
	}
	minMax( v, mxv ){
		let min = v==0? 0 : v-1
		let max = v==mxv? mxv : v+1
		return [ min, max ]
	}
	adjCells( y, x ){
		let adj = []
		let [xmin,xmax] = this.minMax( x, this.XSize-1 )
		let [ymin,ymax] = this.minMax( y, this.YSize-1 )
		for ( let dy=ymin; dy<=ymax; dy++ )
			for ( let dx=xmin; dx<=xmax; dx++)
				if ( y!=dy || x!=dx ) 
					adj.push( { y:dy, x:dx } )
		return adj
	}
	registerSW(){
		if ('serviceWorker' in navigator) {
		   window.addEventListener('load', () => {
			 navigator.serviceWorker.register('/service-worker.js').then(registration => {
			   console.log('SW registered: ', registration)
			 }).catch(registrationError => {
			   console.log('SW registration failed: ', registrationError)
			 })
		   })
		 }
	}
	resizeApp(){
		this.windowW = window.innerWidth
		this.windowH = window.innerHeight
		this.headerH = HUI.gEl('header').clientHeight
	}
	addMove( y,x, user ){
		this.gamesteps.push( { x: x, y: y, user: user } )
	}
	unplay( y,x ){  // revert to original state -- secret
		this.selCell( y, x )
		let id = this.gID( y, x )
		for ( let cls of [ 'cleared','freed','marked','exploded','bombed','tm','t0','t1','t2','t3','t4','t5','t6','t7','t8' ] ){
			if ( HUI.hasClass( id, cls )){
				HUI.setClass( id, cls, false )
				if ( cls.charAt(0)!='t' ) this[cls]--
			}
		}
		HUI.setClass( id, 'secret', true )
		this.secret++
		this.showCnts()
	}
	selWinnable(){	// reset
		if ( this.opt.getVal('W')){
			let r = Math.trunc(this.winnableGames.length * this.rand())
			this.opt.setVal( 'Game', this.winnableGames[r] )
		}
		this.resetApp()
	}
	changeGame(){
		this.opt.setVal( 'W', true )
		this.resetApp()
	}
	resetApp(){
		this.gameNum = this.opt.getVal('Game')
		let [ gm, numsafe ] = this.gameNum.split('-')
		gm = Number(gm)
		numsafe = numsafe==undefined? 0 : Number( numsafe )
		
		this.errCnt = 0
		if ( this.gameNum=='0' || this.gameNum=='' ){
			this.gameName = 'Random'
		} else {
			this.gameName = `ClearFieldGame${gm}`
			this.randgen = new Rand( this.gameName )
			this.opt.setVal( 'X', 20 )
			this.opt.setVal( 'Y', 20 )
			this.opt.setVal( 'Density', 20 )
		}
		this.gameover = false
		this.gamesteps = []
		this.resizeApp() // record winow size
		HUI.setClass( 'Popup', 'hide', true )

		let xc = this.XSize = this.opt.getVal('X')
		let yc = this.YSize = this.opt.getVal('Y')
		this.Density = this.opt.getVal('Density')/100
		this.fillField( xc, yc, this.Density )	
		if ( typeof numsafe == 'number' )
			for (let i=0; i<numsafe; i++){
				this.usedFree = false
				this.randSafeClick()
			}
		
		let csz = this.cellSize = 21.25;  //HUI.gEl('m0000').offsetWidth but with fraction
		
		this.game = { ver: this.Version, sz: xc*yc, mines: this.mines }
		
		let data = HUI.gEl('data')
		data.style.width = `${xc*csz}px`
		data.style.height = `${yc*csz}px`

		this.longtouchtimer = 0;
		this.touchduration = 500; //length of time we want the user to touch before we do something
		this.touchZooming = false 
		this.touchDist = 0
		this.touchStartDist = 0
		this.selX = 0
		this.selY = 0
		this.usedFree = false	// first safe click is free
		
		let dataW = data.clientWidth 
		let dataH = data.clientHeight
		let hdrH = HUI.gEl('header').clientHeight
		let bodyW = window.innerWidth
		let bodyH = window.innerHeight
		let zmw = bodyW / dataW
		let zmh = (bodyH-hdrH) / dataH
		this.touchZoom = Math.trunc( (zmw < zmh? zmw : zmh) * 90 )
		this.setZoom( this.touchZoom, 0,0 )
		msg( `${this.title} ${this.gameName}-${numsafe}` )
		this.showCnts()
	}
	clearSel(){
		HUI.setClass( this.gID( this.selY, this.selX ), 'sel', false )		
	}
	selCell( y, x ){
		this.clearSel()
		this.selY = y
		this.selX = x
		HUI.setClass( this.gID( this.selY, this.selX ), 'sel', true )
	}
	keydown( evt ){
		let y = this.selY
		let x = this.selX
		switch ( evt.key ){
			case 'ArrowUp':
			case 'i':
				this.selCell( this.clipY( y-1 ), x )
				return
			case 'ArrowDown':
			case 'k':	
				this.selCell( this.clipY( y+1 ), x )
				return
			case 'ArrowLeft': 
			case 'j':	
				this.selCell( y, this.clipX( x-1 ))
				return
			case 'ArrowRight':
			case 'l':	
				this.selCell( y, this.clipX( x+1 ))
				return
			case 's':
				this.randSafeClick()
				return
			case 'r':
				this.resetField()
				return
			case 'm':	
				this.markCell( y, x )
				return
			case ' ':
				this.doGridClick( y, x, false )
				return
			default:
		}
	}
	cntGrid( cls ){
		let cnt=0
		for (let y=0; y<this.YSize; y++){
			for (let x=0; x<this.XSize; x++){
				if ( HUI.hasClass( this.gID(y,x), cls )) 
					cnt++
				if ( cls=='cleared' && HUI.hasClass( this.gID(y,x), 'processed' ))
					cnt++
			}
		}
		return cnt
	}
	checkCnt( cnt, cls ){
		let act = this.cntGrid( cls )
		if ( act != cnt ){
			this.errCnt++
			if (this.errCnt==1) 
				console.log(`chkCnt ${cls}`)
			debugger
		}
	}
	showCnts(){
		let right=0, wrong=0
		for (let y=0; y<this.YSize; y++){
			for (let x=0; x<this.XSize; x++){
				if ( HUI.hasClass( this.gID(y,x), 'marked' )){
					if ( this.grid[y][x] < 0 ) 
						right++
					else
						wrong++
				}
			}
		}
		
		this.gui.setVal('Mines:', `${this.mines} ${this.exploded}E ${this.marked}M` )
		let err = this.errCnt == 0? '' : `${this.errCnt}E`
		this.det.setVal('Details:', `${this.mines}* (${this.marked}M ${wrong}W ${right}R) ${this.exploded}E ${this.bombed}B ${this.cleared}C ${this.freed}F ${this.secret}S ${err}` )

		for (let n of ['secret','marked','cleared','exploded','bombed']){
			this.checkCnt( this[n], n )
		}
		if ( this.secret == 0 ){
			this.gameOver()
		}
	}
	gameOver(){
		if ( this.PlayTest ) return
	
	if (this.errCnt != 0) console.log( `${this.errCnt} errs` )
		msg('Game Over!')
		if ( this.gameover ) debugger
		this.gameover = true
		navigator.vibrate( [100,50,100,50,200] )
		
		this.wrong = 0
		this.right = 0
		for (let y=0; y<this.YSize; y++){
			for (let x=0; x<this.XSize; x++){
				let id = this.gID(y,x)
				if ( HUI.hasClass( id, 'marked' ) ){
					if ( this.grid[y][x] < 0 ){
						this.right++
						HUI.setClass( id, 'right', true )
					} else {
						this.wrong++
						HUI.setClass( id, 'wrong', true )
					}
				}
			}
		}
		this.score = Math.round( (this.cleared - 2*(this.exploded + this.bombed) - 5*this.wrong)*100 / this.possible )
		msg( `Game Over! Score: ${this.score}` )
		this.game.end = dayjs().format('YYYY-MM-DD HH:mm:ss')
		this.game.unm = this.UserName
		this.game.score = this.score
		this.game.fre = this.freed
		this.game.clr = this.cleared
		this.game.exp = this.exploded
		this.game.bmb = this.bombed
		this.game.wrg = this.wrong
		let ng = Number( localStorage.getItem('nGames'))
		localStorage.setItem( 'nGames', ng+1 )
		let gm = this.game
		localStorage.setItem( `G${ng}`, JSON.stringify(gm) )
		//`${gm.start}..${gm.end} ${gm.unm} Sc${gm.score} Sz${gm.sz} M${gm.mines} F${gm.fre} C${gm.clr} E${gm.exp} B${gm.bmb} W${gm.wrg} V${gm.ver}` )
	}
	showGames(evt){
		evt.stopPropagation()
		if ( HUI.hasClass( 'Popup', 'hide' )){
			HUI.setClass( 'Popup', 'hide', true )
			return
		}
		let ng = Number( localStorage.getItem('nGames'))
		let html = ''
		let user = ''
		let date = ''
		for (let i=0; i< ng; i++){
			let gmstr = localStorage.getItem( `G${i}` )
			let gm = undefined
			try {
				gm = JSON.parse( gmstr )
			} catch {
				localStorage.removeItem( `G${i}` )
			}
			if ( gm != undefined ){
				let st = dayjs( gm.start )
				let dt = st.format('D-MMM-YY')
				if ( dt != date || gm.unm != user ){
					date = dt
					user = gm.unm
					html += `${date} ${user}: <br>`
				}
				let end = dayjs( gm.end )
				html += `  ${st.format('H:mm')} ${end.diff(st,'minute',true).toFixed(1)}m  &nbsp;&nbsp; Score:${gm.score} <br>`
			}
		}
		if ( this.touchHist ){
			let tH = this.touchHist
			html = `pS:${tH.panStartPt.x},${tH.panStartPt.y} <br>`
			html += `tS:${tH.touchStartPt.x},${tH.touchStartPt.y} <br>`
			html += `sD:${tH.touchStartDist} Z:${tH.touchStartZoom} <br>`
			for ( let u of tH.updt ) 
				html += ` zm:${u.zm} dx:${u.dx} dy:${u.dy} <br>`
		}
		HUI.gEl('Popup').innerHTML = html
		HUI.setClass( 'Popup', 'hide', false )
	}
	updatePos(){
		let zm = this.dbg.getVal('zm:')
		let dx = this.dbg.getVal('dx:')
		let dy = this.dbg.getVal('dy:')
		this.setZoom( zm, dy, dx )
	}	
	setZoom( zm, dy,dx ){
		zm = Number(zm)
		dy = Number(dy)
		dx = Number(dx)
	//	msg( `${dx},${dy}  ${zm}%` )
		let data = HUI.gEl('data')
		let gsize = { x: data.clientWidth, y: data.clientHeight }
		let scrsize = { x: this.windowW*100/zm, y: this.windowH*100/zm - this.headerH }
		let zf = 100/zm
		let minx = scrsize.x - gsize.x*1.2 - 20
		let miny = scrsize.y - gsize.y*1.2 - 20
		
		msg( ` [${Math.round(scrsize.x)}->${Math.round(minx)}, ${Math.round(scrsize.y)}->${Math.round(miny)}]` )
	//msg( `${this.windowH}*${zf.toFixed(2)}-${this.headerH}=${Math.round(scrsize.y)} ? ${gsize.y} `)
		if ( scrsize.y < gsize.y )
			dy = Math.round( this.clip( dy, miny, 20 ) )
		else dy = 10
		if ( scrsize.x < gsize.x )
			dx = Math.round( this.clip( dx, minx, 20 ) )
		else dx = 10
		
		data.style.zoom = `${zm}%`
		data.style.top = `${dy}px`
		data.style.left = `${dx}px`
		//msg( ` => ${dx},${dy}  ${zm}%`, true )
		
		let hdr = HUI.gEl('header')
		let hdrw = Math.round( hdr.getBoundingClientRect().width )
		let dtaw = Math.round( data.getBoundingClientRect().width )
		//msg( ` hW,dW:${hdrw},${dtaw}` )
		let hzm = Math.round( dtaw*100/hdrw )
		if (hzm < 100) hzm = 100
		hdr.style.zoom = `${hzm}%` 
		//msg( ` & ${hzm}%`, true )
	}
	touchmove( evt ){
		if ( evt.touches.length == 2 ){
			this.touchHist = false	// {}
			let tH = this.touchHist
			
			let t1 = evt.touches.item(0)
			let t2 = evt.touches.item(1)
			this.touchPt = { x:(t1.clientX + t2.clientX)/2, y:(t1.clientY + t2.clientY)/2 }
			let xd = t1.clientX - t2.clientX
			let yd = t1.clientY - t2.clientY
			this.touchDist = Math.round( Math.sqrt(xd*xd + yd*yd))
			let data = HUI.gEl('data')
			if (this.touchZoom==undefined) this.touchZoom = 100
			if ( this.touchStartDist == 0 ){
				let r = data.getBoundingClientRect()
				let lx = data.style.left, ty = data.style.top
				//msg( `T,L=${ty},${lx}=${r.top},${r.left}` )
				this.panStartPt = { x: Number( lx.replace('px','')), y: Number( ty.replace('px','')) }
				this.touchStartPt = { x: this.touchPt.x, y: this.touchPt.y }
				this.touchStartDist = this.touchDist
				this.touchStartZoom = this.touchZoom
				if ( tH ){
					for ( let n of ['panStartPt','touchStartPt','touchStartDist','touchStartZoom'])
						tH[n] = this[n]
					tH.updt = []
				}
			}
			this.touchZoom = Math.trunc( this.touchStartZoom * (this.touchDist / this.touchStartDist) )
			let dx = Math.trunc( this.touchPt.x - this.touchStartPt.x )
			let dy = Math.trunc( this.touchPt.y - this.touchStartPt.y )
			//msg( `${this.panStartPt.x},${this.panStartPt.y} + ${dx},${dy} ` )
			
			if (tH && tH.updt)
				tH.updt.push( { zm: this.touchZoom, dy: this.panStartPt.y + dy, dx: this.panStartPt.x + dx } )
			this.setZoom( this.touchZoom, this.panStartPt.y + dy, this.panStartPt.x + dx )
		}
	}
	touchstart( evt ) {
		//msg( `T${evt.touches.length}` )
		this.clearSel()
		this.clearTouch()
		evt.preventDefault()
		if ( evt.touches.length > 1 ){
			this.touchZooming = true 
			//msg( 'TZ', true )
		} else
			this.longtouchtimer = setTimeout( this.onlongtouch.bind(this,evt), this.touchduration ); 
	}
	clearTouch(){
		if (this.longtouchtimer != 0){
			clearTimeout( this.longtouchtimer ) 
			this.longtouchtimer = 0
		}
	}
	touchend( evt ) {	
		this.clearTouch() //stops short touches from firing the event
		evt.preventDefault()
		if ( this.touchZooming ){
			//msg( `E${evt.touches.length}` )
			if ( evt.touches.length == 0 ){
				this.touchZooming = false
				this.touchStartDist = 0
			}
			return
		}
		let tgt = evt.target;
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		this.doGridClick( y, x, false )
	}
	onlongtouch( evt ){
		this.longtouchtimer = 0
		let tgt = evt.target;
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		if ( !HUI.hasClass( tgt, 'secret') && !HUI.hasClass( tgt, 'marked' ) ) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		navigator.vibrate( 60 )
		this.markCell( y, x )
		evt.preventDefault()
	}
	clip(v, min,max){
		return v < min? min : ( v > max? max : v )
	}
	clipY( y ){
		return this.clip( y, 0, this.YSize-1 )
	}
	clipX( x ){ 
		return this.clip( x, 0, this.XSize-1 )
	}
	gID( y, x ){
		if ( y<0 || y>=this.YSize ) return null
		if ( x<0 || x>=this.XSize ) return null
		return 'm' + y.toString().padStart(2,'0') + x.toString().padStart(2,'0')
	}
	fillField( xc, yc, pct ){	
		let vals = [ '*',     '',   '1',   '2',   '3',   '4',   '5',   '6',  '7',    '8' ]
		let cls = [ 'tm', 't0','t1','t2','t3','t4','t5','t6','t7','t8' ] 
		//'t19', 't06', 't03', 't00', 't07', 't01', 't08', 't04', 't09' ]
		let grid = [] 
		let blanks = this.blanks = []
		this.grid = grid
		grid[-1]= []
		grid[yc]= []
		let rle = [], runcnt = 0
		for (let y=0; y<yc; y++){
			grid[y] = []
			for (let x=0; x<xc; x++){
				if ( this.rand() < pct ){
					grid[y][x] = -1
					rle.push( runcnt )
					runcnt = 0
				} else {
					grid[y][x] = 0
					runcnt++
				}
			}
		}
		for (let y=0; y<yc; y++)
			for (let x=0; x<xc; x++)
				if (grid[y][x] >= 0){
					for (let ny=y-1; ny<y+2; ny++)
						for (let nx=x-1; nx<x+2; nx++){
							//console.log( `[${y},${x}] [${ny},${nx}]=${grid[ny][nx]}` )
							if ( grid[ny][nx] == -1 )
								grid[y][x]++;
						}
				}
		let html = ''
		this.secret = xc*yc
		this.possible = 0
		this.cleared = 0
		this.exploded = 0
		this.bombed = 0
		this.marked = 0
		this.freed = 0
		this.mines = 0
		this.wrong = 0
		this.right = 0
		for (let y=0; y<yc; y++){
			for (let x=0; x<xc; x++){
				let idx = grid[y][x]+1
				let id = this.gID(y,x)
				if ( grid[y][x]>=0 ) 
					this.possible++
				else
					this.mines++
				if (grid[y][x]==0) 
					blanks.push( [ y,x] )	
				html += `<span id="${id}" class="grd secret"> ${vals[idx]} </span>`
			} 
			html += '<br>';
		}
		HUI.gEl('data').innerHTML = html;
	}
	clearSecret( id ){
		if (!HUI.hasClass(id, 'secret')){ console.log('SECRET'); debugger }
		HUI.setClass( id, 'secret', false )
		this.secret--
		this.checkCnt( this.secret, 'secret' )
	}
	clearCell( y,x, safe, user ){	
		this.addMove( y, x, user )
		let id = this.gID(y,x)
		let g = this.grid[y][x]
		this.clearSecret( id )
	//	if (!HUI.hasClass(id, 'secret')){ console.log('SECRET'); debugger }
	//	this.secret--
	//	HUI.setClass( id, 'secret', false )
	//	this.checkCnt( this.secret, 'secret' )
		if (safe){
			HUI.setClass( id, 'freed', true )
			this.freed++
			this.checkCnt( this.freed, 'freed' )
	//		this.possible--
		} else {
			if (HUI.hasClass( id, 'cleared')){ console.log('CLEAR'); debugger }
			HUI.setClass( id, 'cleared', true )
			this.cleared++
			this.checkCnt( this.cleared, 'cleared' )
			HUI.setClass( id, g<0? 'tm' : `t${g}`, true )	
		}
		this.showCnts()
	}
	explodeCell( y, x, user ){
		this.addMove( y, x, user )
		let id = this.gID(y,x)
		this.clearSecret( id )
	//	if (!HUI.hasClass(id, 'secret')) debugger
	//	this.secret--
		navigator.vibrate( [50,50,100] )
	//	HUI.setClass( id, 'secret', false )
		HUI.setClass( id, 'exploded', true )
		this.exploded++
		this.showCnts()
	}
	bombCell( y, x ){
		this.addMove( y, x, false )		// alway derived
		let id = this.gID(y,x)
		this.clearSecret( id )
	//	if (!HUI.hasClass(id, 'secret')) debugger
	//	this.secret--
	//	HUI.setClass( id, 'secret', false )
		HUI.setClass( id, 'bombed', true )
		this.bombed++
		this.showCnts()
	}
	markCell( y, x ){
		this.addMove( y, x, true ) // always user
		let id = this.gID(y,x)
		if (HUI.hasClass(id, 'marked')){  // unmark => click
			HUI.setClass( id, 'marked', false )
			this.marked--
			this.checkCnt( this.marked, 'marked' )

			HUI.setClass( id, 'secret', true )  // re-mark secret so doClick will work
			this.secret++
			this.checkCnt( this.secret, 'secret' )
			this.showCnts()
			this.doGridClick( y,x, false )
			return
		}

		this.clearSecret( id )
	//	if (!HUI.hasClass(id, 'secret')) debugger
	//	this.secret--
	//	HUI.setClass( id, 'secret', false )
	
		HUI.setClass( id, 'marked', true )
		this.marked++
		this.checkCnt( this.marked, 'marked' )
		this.showCnts()
	}
	neighbors( y, x ){
		y = Number(y)
		x = Number(x)
		return [ [y-1,x-1], [y,x-1], [y+1,x-1], [y-1,x],[y+1,x], [y-1,x+1],[y,x+1],[y+1,x+1] ]
	}
	gridClick( evt ) {
		HUI.setClass( 'Popup', 'hide', true )
		this.clearSel()
		let tgt = evt.target
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		if (evt.button!=0){  
			this.markCell( y, x )
			evt.preventDefault()
		} else {
			this.doGridClick( y, x, false )
		}
	}
	doGridClick( y, x, safe ){
		let cid = this.gID(y,x)
		if ( !HUI.hasClass( cid, 'secret' )) return
		
		if (this.game.start==undefined){
			this.game.start = dayjs().format('YYYY-MM-DD HH:mm:ss')
			this.game.nMoves = 0
		}
		this.game.nMoves++
		if ( this.grid[y][x] < 0 ){	//detonate mine
			this.explodeStep( y,x, true )
			return
		}
		
		this.clearCell( y, x, safe, true )
		if ( this.grid[y][x]==0){  // auto-spread clearing
			this.spreadClear( y,x, safe )
		}
		this.showCnts()
	}
	spreadClear( y,x, safe ){
		let todo = this.neighbors(y,x); 
		while (todo.length>0){
			let [y2,x2] = todo.pop()
			let id = this.gID(y2,x2)
			if ( this.grid[y2][x2]>=0 && HUI.gEl(id).classList.contains('secret') ){
				this.clearCell(y2,x2, safe, false)
				if (this.grid[y2][x2]==0){
					let nbrs = this.neighbors( y2, x2 )
					todo = todo.concat( nbrs )
				}
			}
		}
	}
	explodeStep( y,x, user ){
		let id = this.gID(y, x)
		if ( HUI.hasClass( id, 'exploded' )) return
		
		HUI.setClass( id, `exploding`, true )
		this.explodeCell(y,x, user)
		let nbrs = this.neighbors( y, x )
		for ( let [y2, x2] of nbrs ){
			let id2 = this.gID(y2,x2)
			if ( id2!=null && HUI.hasClass( id2, 'secret' )){
				let g = this.grid[y2][x2]
				if ( !HUI.hasClass(id2, 'marked') || g>=0 ){
					if ( g < 0 ){
						setTimeout( this.explodeStep.bind(this, y2,x2,false), 300 )
					} else
						this.bombCell( y2,x2 )
				}
			}
		}
		setTimeout( HUI.setClass( id, 'exploding', false ), 2500 )
	}
	randSafeClick(){	// click a random blank cell
		while (this.blanks.length > 0){
			let r = Math.floor( this.rand() * this.blanks.length )
			let [y,x] = this.blanks[r]
			if ( HUI.hasClass( this.gID(y,x), 'secret' )){
				this.doGridClick( y, x, this.usedFree )
				for (let i=this.blanks.length-1; i>=0; i--){
					[y,x] = this.blanks[i]
					if ( HUI.hasClass( this.gID(y,x), ['cleared','freed'] ))
						this.blanks.splice( i, 1 )
				}
				this.usedFree = true	// further safe clicks aren't free
				return true
			}
		}
		msg('No more blanks!')
		return false
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
var jsApp = new App( 'ClearField  May2023.71' )
