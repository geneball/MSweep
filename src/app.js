/*---------------  ClearField design
  Offline:
	1) generate a list of winnable starting positions by:
	    a) setting random key by name string "CF_GmX"
		b) auto-selecting random sequence of 0-neighbor cells until none left
		   E.g. "CF_Gm77-11" is seeded with "CF_Gm77", then cells are filled with 
		     mines as specified probability (e.g. 20%), then 11 'blank' cells are selected in 
			 random order (& clear neighboring cells). "CF_GM77-11" represents this start state
		c) the game is auto-played deterministically: if its stalls (i.e. requires a guess) that seed isn't used
		   if it clears the entire board, the sequence of earlier games are tried to find the first that is 'winnable'
		   E.g. CF_GM77-10, CF_Gm77-9, (since CF_Gm77-8 isn't winnable,  CF_Gm77-9 is added to the list)
	2) cells that were required by the particular winning game sequence (i.e. the cell value allowed the player to
		mark or clear some adjacent cells) are recorded & the non-critical cells are marked as '?' (the game can be won
		without that information ever being visible)
	3) winning game descriptions are saved on KVdb.io as ~500 character json entries, with Keys G0000 .. G1060, e.g
	   E.g. G0003 = 
	   {
			"id":"G0003",			// position in sequence of winnable games
			"G":"CF_Gm77-9",		// random number key to reproduce this game
			"nS":169,				// number of secret cells in initial position 
			"nQ":124,				// number of ? cells (info not necessary to win)
			"XSz":"20",				// dimmensions of playfield
			"YSz":"20",				// dimmensions of playfield
			"st":[					// initial state of cells, encoding:
									//    1) Mine, 2) Secret or not, 3) ? or  not, & 4) # of neighboring mines
				"AEDobbboAAAobboCPDDO",
				"PAAdoppqqedcbbdAEAAC",
				"OdddADAAobbbbbdAQEQD",
				"CoboOpddcoooboeQPCAO",
				"AdboCobbboAoboAAdcoo",
				"ApboAdooboocbdFApbbb",
				"OcbopEAobbbbbcAEpcbb",
				"DpoboAdcbbbbbcodAobb",
				"AAdboocbbooobbbpDqoc",
				"QApbbbbbboAobbbcAEAD",
				"DPcbboocboCpooodPQAP",
				"ADoocpAdddCCACCACPPP",
				"DAOCADDQAAcocpPdccAC",
				"CODDPPPAREdbboAcbcoc",
				"OCEAPCAPDApcccOdccbb",
				"CAQAdocdDPPADOOCAobb",
				"DpdccbbcADEQRAOOCobb",
				"AdbbodpdEAEAAdcoDpcb",
				"ApbodAACEASEqcboAAob",
				"OcbcAEDCDAQAcbboPDcb"
			],
			"diff":"E"		// difficulty of 'E'asy, 'M'edium, 'H'ard, or 'X'pert based on # of secret cells
		}
	4) Lists of the games in each difficulty group are saved, that index produces a name within the group:
	     E.g. CF_difficulty.E = [ "G0003","G0023","G0025","G0028","G0031", ..."G1059" ]
		 so game "E0001" = "G0003" described above
	5) Since displaying all '?' cells with ? hints at a viable winning sequence (if a cell has a number, it must
		allow you to expose its neighbors at some point), only some are displayed as ?--  the % displayed depends
		on difficulty:  Easy: 0%,  Medium:  20%,  Hard: 50%,  Xpert: 80%  
	The result of this pre-processing is that each user will see an identical sequence of winnable games by
		selecting Easy, Medium, Hard, or Expert or Daily
	
  Online:
	Localstorage keeps track of each users position within the game sequences by difficulty
	The game can be played to completion, even if Mines are exposed
	'Hint' highlights a randomly selected cell with a value that provides enough info for at least one safe move.
	'Daily' plays the game-of-the-day (even if it repeats or is out of order) 
	
	The game keeps track of #Error & #Hints
	If played to completion, those #s & elapsed time are recorded in localstorage and at KVdb.io:
	  UGm0001: { U: "U00327", gm: "E0001", nH: 0, nE: 0, nS: 427 } 
	At game start, the Best-time (with 0H & 0E) recorded at KVdb is displayed, 
	Statistics are kept at KVdb for each Game:
	{ gm: "E0001", nGms: 8237,
	  nE: [ 
		[  { bestTime: 387, BTuser: "U00327", firstUser: "U00037", nGms: 1287 }, {...}, {...} ] // nE=0, nH=0,1,2,>2
		[...]  // nE=1, nH=0,1,2,>2
		[...]  // nE=2, nH=0,1,2,>2
		[...]  // nE>2, nH=0,1,2,>2
		]
	  Cntsbytime0EH: [ ...  ]  // bins of 10s intervals
	}
	For the 0E 0H case, counts of completion times can be kept in bins (& rebinned if necessary) to allow you to report
	  "You completed X0032 faster than 32% of players"

	Reportable values:
	  1) # of daily games completed
	  2) streak of consecutive daily games
	  3) total games played (by difficulty)
	  4) streak of games completed 
	  5) streak of 0E 0H games
	  6) # of games you were first to complete
	  7) # of games you currently are fastest to complete
	  Last game:
	  8) First to complete
	  9) percentage of players who completed slower (with same E&H)
	  10) % of players requiring more errors to complete
	  11) % of players requiring more hints to complete
	E.g.: 
	  You finished M0089 with fewer errors than 82% of players & fewer hints than 25%
	  
	KVdb can also compile a list of records held by each user periodically--  e.g.
	  You were the first to complete:
	  Game    Errs Hints
	  E0037		0	0
	  H0923 	1	0
	  X0082		0	1
	  You hold the current best time for:
	   Game    Errs Hints	Time
	  E0107		0	0		1:22
	  M0292 	1	0		8:24
	  
	Monetization?
		pay 5$ to unlock more than 1st 30 games in each difficulty?
		(and stop ads?)
 -----------------------------*/
	import { err, msg, statusMsg, question } 				from './msg.js'
	import { HUI, GUI } 									from './htmlui.js'
	import './gb53.css'
	import dayjs											from 'dayjs'
	import dayOfYear										from 'dayjs/plugin/dayOfYear'
	import Rand, {PRNG} 									from 'rand-seed'
	import * as KVdb										from 'kvdb.io'
	
export class App {
	constructor( title ){
		this.title = title
		let el = HUI.gEl('title')
		if (el) el.innerText = this.title
		
		this.Version = '1.0_5/28/23'
		dayjs.extend( dayOfYear )

		this.registerSW()		// service worker setup
	
		let ng = Number( localStorage.getItem( 'nGames' ))
		if ( ng==undefined ) localStorage.setItem( 'nGames', 0 )
		this.UserName = localStorage.getItem( 'user' )
		if ( this.UserName == undefined ) this.UserName = ''
		
		App.currApp = this
		
		this.initMenu()
				
		this.maxunwinnable = 30000	
		
		this.bucketKey = 'XuwVGZhBjT5dPVZGhsTLKG' 
		this.writeKey = '7z!FkVC&5KD6'
		this.initDB()
		
		this.categories = { E: 'Easy', 'M': 'Medium', 'H': 'Hard', 'X':'Expert', 'D':'Daily' }
		// this.Games = {		// nSecret difficulty thresholds
			// E: 	{ maxSecret: 191, GameDefs: [] },	// 0-25% 
			// M:	{ maxSecret: 219, GameDefs: [] },	// 25-50%
			// H:	{ maxSecret: 262, GameDefs: [] },	// 50-75%
			// X:	{ maxSecret: 400, GameDefs: [] }	// 75-100%
		// }
		


		this.initGridEncoder()   // define game state translations 

		this.errCnt = 0
		this.initListeners()
		msg( this.title )
		this.showHelp()
	}
	initListeners(){
		HUI.addListener( 'btnE', 'click', (evt)=>this.nextGame( 'E' ))
		HUI.addListener( 'btnM', 'click', (evt)=>this.nextGame( 'M' ))
		HUI.addListener( 'btnH', 'click', (evt)=>this.nextGame( 'H' ))
		HUI.addListener( 'btnX', 'click', (evt)=>this.nextGame( 'X' ))
		HUI.addListener( 'btnD', 'click', (evt)=>this.nextGame( 'D' ))
		HUI.addListener( 'btnHint', 'click', (evt)=>this.genHint( ))
		HUI.addListener( 'btnQuit', 'click', (evt)=>this.quitGame( ))
		HUI.addListener( 'btnHelp', 'click', (evt)=>this.showHelp( ))
		HUI.addListener( 'btnES', 'click', (evt)=>this.showStats( 'E' ))
		HUI.addListener( 'btnMS', 'click', (evt)=>this.showStats( 'M' ))
		HUI.addListener( 'btnHS', 'click', (evt)=>this.showStats( 'H' ))
		HUI.addListener( 'btnXS', 'click', (evt)=>this.showStats( 'X' ))
		HUI.addListener( 'btnDS', 'click', (evt)=>this.showStats( 'D' ))
		HUI.addListener( 'btnR', 'click', (evt)=>this.showRecords( ))
		HUI.addListener( 'btnNewH', 'click', (evt)=>this.showMenu( evt ))
		HUI.addListener( 'btnNewC', 'click', (evt)=>this.showMenu( evt ))
		HUI.addListener( 'btnNewUR', 'click', (evt)=>this.showMenu( evt ))
		HUI.addListener( 'btnNewCat', 'click', (evt)=>this.showMenu( evt ))
		
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
	initGridEncoder(){
		// encode( this.grid[y][x], innerText=='?', hasClass('secret') )
		// idx = (this.grid[y][x]+1) * ((innerText=='?' 1 : 2 ) + (hasClass('secret')? 2 : 0) )
		// maps -1..8,?,S => 0..9 * 1..4 = 0..36
		//                 [ !? !S  ][ ? !S   ][ !? S   ][  ?  S  ]
		this.gridEncode = 'abcdefghijmnopqrstuvABCDEFGHIJMNOPQRSTUV'
		this.decodeGridVal = { 
			'a': -1, 'b': 0, 'c': 1, 'd': 2, 'e': 3, 'f': 4, 'g': 5, 'h': 6, 'i': 7, 'j': 8,
			'm': -1, 'n': 0, 'o': 1, 'p': 2, 'q': 3, 'r': 4, 's': 5, 't': 6, 'u': 7, 'v': 8,
			'A': -1, 'B': 0, 'C': 1, 'D': 2, 'E': 3, 'F': 4, 'G': 5, 'H': 6, 'I': 7, 'J': 8,
			'M': -1, 'N': 0, 'O': 1, 'P': 2, 'Q': 3, 'R': 4, 'S': 5, 'T': 6, 'U': 7, 'V': 8
		}
		this.decodeQuest = {
			'a': 0, 'b': 0, 'c': 0, 'd': 0, 'e': 0, 'f': 0, 'g': 0, 'h': 0, 'i': 0, 'j': 0,
			'm': 1, 'n': 1, 'o': 1, 'p': 1, 'q': 1, 'r': 1, 's': 1, 't': 1, 'u': 1, 'v': 1,
			'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0, 'G': 0, 'H': 0, 'I': 0, 'J': 0,
			'M': 1, 'N': 1, 'O': 1, 'P': 1, 'Q': 1, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 1
		}
		this.decodeSecret = {
			'a': 0, 'b': 0, 'c': 0, 'd': 0, 'e': 0, 'f': 0, 'g': 0, 'h': 0, 'i': 0, 'j': 0,
			'm': 0, 'n': 0, 'o': 0, 'p': 0, 'q': 0, 'r': 0, 's': 0, 't': 0, 'u': 0, 'v': 0,
			'A': 1, 'B': 1, 'C': 1, 'D': 1, 'E': 1, 'F': 1, 'G': 1, 'H': 1, 'I': 1, 'J': 1,
			'M': 1, 'N': 1, 'O': 1, 'P': 1, 'Q': 1, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 1
		}
	}
	initMenu(){
		this.gui = new GUI( 'header', 'hdr', '_', true )

		this.gui.addBreak()
		// this.gui.addButton( 'Easy', 	(evt)=>this.nextGame( 'E' ) ) 
		// this.gui.addButton( 'Medium', 	(evt)=>this.nextGame( 'M' ) ) 
		// this.gui.addButton( 'Hard', 	(evt)=>this.nextGame( 'H' ) ) 
		// this.gui.addButton( 'Expert', 	(evt)=>this.nextGame( 'X' ) ) 
		// this.gui.addButton( 'Daily', 	(evt)=>this.nextGame( 'D' ) ) 
		// this.gui.addButton( 'Hint', 	(evt)=>this.genHint( ) ) 

	//	this.gui.addValue('Mines:', '* E M' ) //`${this.mines} - ${this.exploded}E - ${this.marked}M` )
	//	this.gui.addButton('Safe', ()=>this.randSafeClick()) 
		this.gui.addButton('Stats', (evt)=>this.showGames(evt) ) 
		this.gui.addButton('Autoplay', (evt)=>this.play( 10 ) ) 

		this.gui.addNumber('X', 20 )
		this.gui.addNumber('Y', 20 )
		this.gui.addNumber('Mine%', 20 )
	//	this.opt.addText( 'Username', this.UserName, (val)=>{ this.updateUser( val ) } )

		this.det = this.gui.addGroup('Details','Det', true)
	//	this.gui.addBreak()
		this.det.addValue( 'Details:', 0 )
		
		this.mng = this.gui.addGroup('Manage','Mng', true)
	//	this.mng.addNumber( 'nxtID', 0 )
		this.mng.addNumber( 'GmStart', 0 )
		this.mng.addNumber( 'Batch', 100 )
		this.mng.addButton( 'Save', (evt)=>this.findWinnable( evt ) ) 
		
		this.dbg = this.gui.addGroup('Debug','Dbg', true)
		this.dbg.addNumber( 'zm:', 0, this.updatePos.bind(this) )
		this.dbg.addNumber( 'dx:', 0, this.updatePos.bind(this) )
		this.dbg.addNumber( 'dy:', 0, this.updatePos.bind(this) )
		this.dbg.addButton( 'Colors', ()=>this.chooseColor())
		this.dbg.addCheckbox( 'TM' )
		this.dbg.addButton( 'UnPlay', (evt)=>this.unplayLast( evt ) ) 
		this.dbg.addCheckbox( 'PropExp' ) 
		this.dbg.addButton( 'Quest', (evt)=>this.calcQuest( evt ) ) 
		this.dbg.addButton( 'Eval', (evt)=>this.findWinnable() ) 
		this.dbg.addNumber( 'mxG', 50 )
		
		HUI.setClass( 'guiG0', 'hide', true )
	}

	showPanels( hdrid, lowerid ){
		msg('')
		for ( let id of ['Playing','Completed','CatStats','UserRecords'] )
			HUI.setClass( id, 'hide', id != hdrid )  // hide all but hdrid
		
		for ( let id of ['data','menu','help'] )
			HUI.setClass( id, 'hide', id != lowerid )  // hide all but hdrid
	}
//***************** ONLINE play ****************
	registerSW(){			// create service worker 
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
	resizeApp(){			// process screen size change
		this.windowW = window.innerWidth
		this.windowH = window.innerHeight
		this.headerH = HUI.gEl('header').clientHeight
	}
	async initDB(){		// init db & user & set mng.GmStart from maxGms
	
		// const oldBucket = 'Vat5Fw1JLaiatVabg8XBWJ'
		// await fetch(`https://kvdb.io/${oldBucket}/?write_key=${write_key}`, { method: 'DELETE'})
	// .then(res => res.text())
	// .then( res => console.log(` Delete bucket ${res}`) )

		this.bucket = new KVdb.Bucket( this.bucketKey )
		
		this.userID = localStorage.getItem('UserID')
		if ( this.userID == undefined ){
			let nextUser = await this.getDBObj( 'nextUserID', 1 )
			this.userID = `U${this.pad4(nextUser)}`
			this.bucket.set( 'nextUserID', Number(nextUser) + 1 )
			localStorage.setItem( 'UserID', this.userID )
		}
		
		this.userRecords = await this.getDBObj( this.userID, { numFirsts: 0, numBests: 0 } )
			
		this.maxGms = await this.getDBObj( 'maxGms',  { E: 0,	M: 0, H: 0,	X: 0, seed: 0 } )	
		this.mng.setVal( 'GmStart', this.maxGms.seed )  // random seed to start with
		
		if ( this.UserStats == undefined ){
			let ststr = localStorage.getItem('UserStats')
			if ( ststr != undefined && ststr.startsWith('{'))
				this.UserStats = JSON.parse( ststr )
			else {
				this.UserStats = {
					userID: this.userID,
					gamesStarted: 0,
						// #compl   #0E0H		# in a row  # 0E0H in row
					E:	{ cCnt: 0, 	pCnt: 0,	cStrk: 0,	pStrk: 0  },
					M:	{ cCnt: 0, 	pCnt: 0,	cStrk: 0,	pStrk: 0  },
					H:	{ cCnt: 0, 	pCnt: 0,	cStrk: 0,	pStrk: 0  },
					X:	{ cCnt: 0, 	pCnt: 0,	cStrk: 0,	pStrk: 0  },
					D:	{ cCnt: 0, 	pCnt: 0,	cStrk: 0,	pStrk: 0  }
				}
				localStorage.setItem( 'UserStats', JSON.stringify( this.UserStats )) 
			}
		}
		if ( this.UserStats.userID != this.userID ){
			this.UserStats.userID = this.userID
			localStorage.setItem( 'UserStats', JSON.stringify( this.UserStats )) 
		}
		
		this.initDaily()
	}
	initDaily(){
		let randgen = new Rand( dayjs().get('year') )	// always same random seq per year
		// sequence changes if #/category changes-- but for everyone at the same time
		let games = []
		let nE = this.maxGms.E, nM = this.maxGms.M, nH = this.maxGms.H, nX = this.maxGms.X
		if (nM > nE/2) nM = nE/2
		if (nH > nE/3) nH = nE/3
		if (nX > nE/4) nX = nE/4
		for (let i=0; i < nE; i++) games.push( `E${this.pad4(i)}` )
		for (let i=0; i < nM; i++) games.push( `M${this.pad4(i)}` )
		for (let i=0; i < nH; i++) games.push( `H${this.pad4(i)}` )
		for (let i=0; i < nX; i++) games.push( `X${this.pad4(i)}` )
		while (games.length < 366)
			games = games.concat( games )
		this.Daily = []		// gen 366 gameID's .. ['E0207','X0194',... (mostly Easy, fewest X)
		for ( let i = 0; i<366; i++ ){
			let r = Math.trunc( randgen.next()*games.length )
			let gm = games[r]
			games.splice( r, 1 )	// no duplicates
	
			this.Daily.push( gm )
		}
	}
	updateUser( nm ){		// save user name??
		debugger
		this.UserName = nm
		localStorage.setItem( 'user', nm )	
		if ( this.gameisover ){
			let ng = localStorage.getItem( 'nGames' )-1
			let gmstr = localStorage.getItem( `G${ng}` )
			try {
				let gm = JSON.parse( gmstr )
				gm.unm = this.UserName
				localStorage.setItem( `G${ng}`, JSON.stringify(gm) )
			} catch { 
				console.log('error parsing game') 
				debugger
			}
		}
	}
	initRand( key ){
		this.randgen = new Rand( key )		
	}
	rand(){					// => next random # based on seed
		return this.randgen.next()
	}
	pad4( v ){
		return v.toString().padStart(4,'0')
	}
	pad2( v ){
		return v.toString().padStart(2,'0')
	}
	err( txt ){
		msg( txt )
		console.log( txt )
		debugger
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

// command buttons  Easy..Expert, Daily, Hint, Stats
	resetGrid( ){	// reset grid array & counters
		this.grid = []
		this.grid[-1]= []   // extra rows to limit y-1 & y+1 error checking
		this.grid[ this.YSize ]= []
		
		this.errCnt = 0				// # of counter errors (debug)
		this.gameisover = false
		this.gamesteps = []			// list of user moves for Unplay
		this.blanks = []			// list of blank cells for randSafeClick
		this.processed = []			// list of cells auto-processed
		this.safeClicks = []		// list of random 0 clicks
		this.secret = 0				// fillField games: set to YSz * YSz
		this.cleared = 0
		this.exploded = 0
		this.bombed = 0
		this.marked = 0
		this.freed = 0
		this.mines = 0
		this.wrong = 0
		this.right = 0
	}
	initCurrGame(){			// reset game stats
		this.game = { 
			ver: this.Version, 
			name: this.gameName,
			errors: 0,
			hints:  0,
			nseconds: 0
		}
		this.startClock()
	}
	startClock(){
		this.game.nseconds = 0
		this.enableClock( true )
		this.updateClock()
		HUI.setClass('Completed', 'hide', true )
	}
	timeStr( nsec ){
		let min = Math.trunc( nsec / 60 )
		let sec = Math.trunc( nsec % 60 )
		if ( min >= 60 ){
			let hr = Math.trunc( min / 60 )
			min = Math.trunc( min % 60 )
			return `${hr}:${this.pad2(min)}:${this.pad2(sec)}`
		} else
			return `${min}:${this.pad2(sec)}`
	}
	updateClock(){
		let ms = Date.now() - this.clockStart
		let nsec = this.game.nseconds + Math.trunc( ms/1000 )	// seconds since last started
		HUI.gEl('Time').innerText = this.timeStr( nsec )	
	}
	enableClock( enab ){
		this.clockRunning = enab
		if ( enab ){
			this.clockStart = Date.now()
			this.clockId = setInterval( this.updateClock.bind(this), 1000 )
		} else {
			this.game.nseconds += Math.trunc( (Date.now() - this.clockStart)/1000 )
			clearInterval( this.clockId )
		}
	}
	refreshStats(){
		HUI.gEl('Game').innerText = this.gameName
		HUI.gEl('Errors').innerText = `${this.game.errors}/3`
		HUI.gEl('Hints').innerText = `${this.game.hints}/3`
		
		if ( this.gmdef.Stats != null && this.gmdef.Stats != undefined ){
			let f = this.gmdef.Stats.firstDate
			if ( f == '' ){
				f = 'Never!'
				HUI.gEl('BestTime').innerText = ''
			} else {
				HUI.gEl('BestTime').innerText = this.timeStr( this.gmdef.Stats.bestTime )
			}
			HUI.gEl('FCompleted').innerText = f
		}
	}
	showHelp(){
		this.showPanels( '', 'help' )
	}
	showMenu( evt ){		// show startup menu
		msg( `Clk ${evt.target.id}` )
		this.showPanels( '', 'menu' )
	}
	showRecords(){	// show users personal records
		this.showPanels( 'UserRecords', 'menu' )
		HUI.gEl('FirstWin').innerText = this.userRecords.numFirsts.toString() 
		HUI.gEl('FastestWin').innerText = this.userRecords.numBests.toString()  
	}
	showStats( diff ){	// show stats for current category E,M,H,X,D
		HUI.gEl('Diff').innerText = this.categories[ diff ]
		HUI.gEl('Cnt').innerText = this.UserStats[ diff ].cCnt
		HUI.gEl('PerfCnt').innerText = this.UserStats[ diff ].pCnt
		HUI.gEl('Strk').innerText = this.UserStats[ diff ].cStrk
		HUI.gEl('PerfStrk').innerText = this.UserStats[ diff ].pStrk
		this.showPanels( 'CatStats', 'menu' )
	}
	showCompleted( perfect ){	// show stats for just completed game
		HUI.gEl('TCompleted').innerText = this.timeStr( this.game.nseconds )

		if ( perfect ){
			HUI.gEl('Perfect').innerText = this.newRecord==''? `${this.gameID} Perfect Game!` : this.newRecord
			HUI.gEl('PctSlowerHd').innerText = `Faster than:` 
			HUI.gEl('PctSlower').innerText = `${Math.round(this.pctSlower)}%` 
		} else {
			HUI.gEl('Perfect').innerHTML =
				`${this.gameID} completed!<br> (${this.game.errors}E ${this.game.hints}H)`
			HUI.gEl('PctSlower').innerText = ''
		}
		HUI.gEl('PctErr').innerText = `${Math.round(this.pctMoreErrs)}%`
		HUI.gEl('PctHint').innerText = `${Math.round(this.pctMoreHints)}%`
		this.showPanels( 'Completed', 'data' )
	}
	initUIstate(){			// reset UI & html state for new game
		let csz = this.cellSize = 21.25;  //HUI.gEl('m0000').offsetWidth but with fraction
		
		this.resizeApp() // record winow size
		HUI.setClass( 'Popup', 'hide', true )

		let data = HUI.gEl('data')
		data.style.width = `${ this.XSize * csz}px`
		data.style.height = `${ this.YSize * csz}px`

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
		
		HUI.setClass( 'Playing', 'hide', false )
	}
	loadGameDef( gmdef ){	// set game state from gmdef
		if ( gmdef.id == undefined || gmdef.XSz == undefined ){
			msg( `invalid gmdef ${gmdef} ${gmdef.id}` )
			debugger
			return
		}
		this.gmdef = gmdef
		const cellTxt = [ '*',     '',   '1',   '2',   '3',   '4',   '5',   '6',  '7',    '8',  '9' ]
		const questPct = { 'E': 0.0, 'M': 0.20, 'H': 0.50, 'X': 0.80 }
		this.initRand( gmdef.G )	// to deterministically choose ?'s
		
		this.XSize = gmdef.XSz
		this.YSize = gmdef.YSz
		this.resetGrid( )
		this.gameID = gmdef.id
		
		let html = ''
		for ( let y = 0; y < this.YSize; y++ ){
			let cells = Array.from( gmdef.st[y] )
			if ( cells.length != this.XSize ){ msg(` bad gamedef: row ${y}` );	debugger }
			this.grid[ y ] = []
			this.processed[y] = []
			for ( let x = 0; x < this.XSize; x++ ){
				this.processed[y][x] = false
				
				let encoding = cells[ x ]
				let gv = this.grid[y][x] = this.decodeGridVal[ encoding ]
				if ( gv >=0 ){
					if ( gv == 0 )
						this.blanks.push( [y,x] )
				} else
					this.mines++
				let cls = `t${gv}`
				
				let id = this.gID( y, x )
				let txt = cellTxt[ gv+1 ]
				if ( this.decodeQuest[ encoding ] == 1 ){ 
					if ( this.rand() <= questPct[ gmdef.diff ] ){ 
						txt = '?'
						cls = 'tQ'
					}
				}
				if ( this.decodeSecret[ encoding ] == 1 ){
					cls = 'grd secret'
					this.secret++
				} else {
					cls += ' grd cleared'
					this.cleared++
				}
				html += `<span id="${id}" class="${cls}"> ${txt} </span>`
			}
			html += '<br>'
		}
		HUI.gEl('data').innerHTML = html;

		this.initCurrGame()
		this.initUIstate()
		
		//msg( `${this.title}      ${this.gameName}` )
		this.refreshStats()
		this.showCnts()
	}
	nextGame( diff ){  		// 'E', 'M', 'H', 'X', or 'D'
		this.currDiff = diff
		this.initCurrGame()
		let GCstr = localStorage.getItem( 'Gcntrs' )
		if ( GCstr == undefined ) 
			GCstr = '{ "E":0,"M":0,"H":0,"X":0,"D":0 }' 
		let	gmCtrs = JSON.parse( GCstr )
		
		let gmNum = 0
		if ( diff=='D' ){
			let idx = dayjs().dayOfYear()	//TODO: multiyear sequence & get gameName
			if ( idx < gmCtrs[ diff ] ){
				msg('Daily game already played')
				return 	// already played
			}
			msg( `Daily ${dayjs().format('D-MMM-YYYY')}` )

			this.gameName = this.Daily[ idx ]  // e.g. E0003
		} else {
			gmNum = gmCtrs[ diff ]
			this.gameName = `${diff}${this.pad4(gmNum)}`
		}
		gmCtrs[ diff ]++
		localStorage.setItem( 'Gcntrs', JSON.stringify( gmCtrs ) )
		
		this.fetchGameDef( this.gameName )		// fetches & loads specified game from DB
		this.showPanels( 'Playing', 'data' )
		
		this.UserStats.gamesStarted++
		localStorage.setItem( 'UserStats', JSON.stringify( this.UserStats )) 
	}
	async fetchGameDef( key ){	// get gmdef from KVdb then loadGameDef
		this.gmdef = await this.getDBObj( key )
		this.loadGameDef( this.gmdef )
	}

	genHint( ){
		if ( this.game.hints == 3 ){
			msg('out of hints')
			return 
		}
		// find a cell that's playable & highlight it
		let poss = []
		for ( let y = 0; y < this.YSize; y++ )
			for ( let x=0; x < this.XSize; x++){
				// find adj nmines, marked & secret
				let ev = this.evalCell( { y: y, x: x }, false )	
				if ( ev != null ){
					let secret = ev.secret.length
					let nhidden = ev.nmines - ev.marked
					if ( nhidden==0 || secret == nhidden ) 
						poss.push( { y: y, x: x } )
				}
			}
		if ( poss.length == 0 ){
			msg('No deterministic move!')
		} else {
			let r = Math.trunc( this.rand() * poss.length )
			let c = poss[ r ]
			this.selCell( c.y, c.x, true )
			this.game.hints++
			this.refreshStats()
		}
	}
//******* for hint
	evalCell( cell, setQ ){		// => cell status if not finished, switches to '?' if no secret neighbors

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
			if ( setQ ) 
				HUI.gEl(id).innerText = '?'  // not needed to win-- set to ?
			//this.markProcessed( id )
			return null	// neighbors all marked or cleared
		}
		let nmines = this.grid[ cell.y ][ cell.x ]	// # of adjacent mines
		return { y: cell.y, x: cell.x, nmines: nmines, marked: marked, secret: secNbrs }
	}
	minMax( v, mxv ){		// => [ v-1, v+1 ] clipped to [0..mxv]
		let min = v==0? 0 : v-1
		let max = v==mxv? mxv : v+1
		return [ min, max ]
	}
	adjCells( y, x ){		// => [ [y,x]... ] of cells adj to y,x
		let adj = []
		let [xmin,xmax] = this.minMax( x, this.XSize-1 )
		let [ymin,ymax] = this.minMax( y, this.YSize-1 )
		for ( let dy=ymin; dy<=ymax; dy++ )
			for ( let dx=xmin; dx<=xmax; dx++)
				if ( y!=dy || x!=dx ) 
					adj.push( { y:dy, x:dx } )
		return adj
	}
	neighbors( y, x ){		// => [ [y-1,x-1]...[y+1,x+1] ]
		y = Number(y)
		x = Number(x)
		return [ [y-1,x-1], [y,x-1], [y+1,x-1], [y-1,x],[y+1,x], [y-1,x+1],[y,x+1],[y+1,x+1] ]
	}

//****** display & game state updates
	gID( y, x ){			// => id of cell y,x eg. 'm0203'
		if ( y<0 || y>=this.YSize ) return null
		if ( x<0 || x>=this.XSize ) return null
		return 'm' + this.pad2(y) + this.pad2(x)
	}
	clearSecret( id ){			// clear class 'secret' & check
		if (!HUI.hasClass(id, 'secret')){ console.log('SECRET'); debugger }
		HUI.setClass( id, 'secret', false )
		this.secret--
		this.checkCnt( this.secret, 'secret' )
	}
	clearCell( y,x, safe, user ){// make move to clear cell
		this.addMove( y, x, user )
		let id = this.gID(y,x)
		let g = this.grid[y][x]
		this.clearSecret( id )
		if (safe){
			HUI.setClass( id, 'freed', true )
			this.freed++
			this.checkCnt( this.freed, 'freed' )
		} else {
			if (HUI.hasClass( id, 'cleared')){ console.log('CLEAR'); debugger }
			HUI.setClass( id, 'cleared', true )
			this.cleared++
			this.checkCnt( this.cleared, 'cleared' )
			if ( HUI.gEl(id).innerText=='?' )
				HUI.setClass( id, g<0? 'tm' : 'tQ', true )	
			else
				HUI.setClass( id, g<0? 'tm' : `t${g}`, true )	
		}
		this.showCnts()
	}
	explodeCell( y, x, user ){	// explode (& propagate)
		this.addMove( y, x, user )
		let id = this.gID(y,x)
		this.clearSecret( id )
		navigator.vibrate( [50,50,100] )
		HUI.setClass( id, 'exploded', true )
		this.exploded++
		this.game.errors++
		if ( this.game.errors == 3 ) 
			this.quitGame()
		else {
			this.refreshStats()
			this.showCnts()
		}
	}
	bombCell( y, x ){			// set cell as destroyed by propagating explosion
		this.addMove( y, x, false )		// alway derived
		let id = this.gID(y,x)
		this.clearSecret( id )
		HUI.setClass( id, 'bombed', true )
		this.bombed++
		this.showCnts()
	}
	markCell( y, x ){			// mark cell by user as likely mine
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
		if ( !HUI.hasClass(id, 'secret')) return   // can't mark cleared cell
		this.clearSecret( id )	
		HUI.setClass( id, 'marked', true )
		this.marked++
		this.checkCnt( this.marked, 'marked' )
		this.showCnts()
	}
	cntGrid( cls ){			// => # cells with class 'cls' 
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
	checkCnt( cnt, cls ){	// consistency check 'cnt' of cells with 'cls'
		let act = this.cntGrid( cls )
		if ( act != cnt ){
			this.errCnt++
			if (this.errCnt==1) 
				console.log(`chkCnt ${cls}`)
			debugger
		}
	}
	showCnts(){				// update 'Mines:' & 'Details:' & check for gameOver
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
	incBin( nsec ){		// increment bin for 'nsec' & return cnt of faster bins
		const BinSz = [  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  5,  // 0..11 -> 60   =  1:00
						10, 10, 10, 10, 10, 10, 10, 10, 10, 10,	10, 10,  // 12..23 -> 180 =  3:00
						20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,	 // 24..35 -> 420 =  7:00
						30, 30, 30, 30, 30, 30, 30, 30, 30, 30,	30, 30,  // 36..47 -> 780 = 13:00
						60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60,  // 48..59 -> 1500 = 25:00
						10000000 										 // 60 ->   >25:00
						]
		let Bins = this.gmdef.Stats.Bins
		if ( Bins.length < BinSz.length )
			for (let i = Bins.length; i<BinSz.length; i++ )
				Bins.push( 0 )
			
		let idx = 0
		let binmax = 0
		let fasterCnt = 0
		for ( let i=0; i < BinSz.length; i++ ){
			binmax += BinSz[i]
			if ( nsec < binmax ){
				Bins[ i ]++
				console.log( `${nsec} into Bins[${i}] ${binmax-BinSz[i]}..${binmax}` )
				return fasterCnt
			} else {
				fasterCnt += Bins[ i ]  // games in this bin were faster
			}
		}
		return fasterCnt
	}
	quitGame(){
		// break streaks & go to menu
		this.enableClock( false )
		this.UserStats[ this.currDiff ].cStrk = 0
		localStorage.setItem( 'UserStats', JSON.stringify( this.UserStats )) 
		this.showPanels( 'Playing', 'menu' )
	}
	gameOver(){				// report stats for game		
		if ( this.PlayTest ) return		// if auto-play
		if ( this.gameisover ) return	// second showCnts
		
		this.gameisover = true
		this.enableClock( false )
		
		if (this.errCnt != 0) console.log( `${this.errCnt} errs` )
		navigator.vibrate( [100,50,100,50,200] )
				
		let gSt = this.gmdef.Stats
		let E = this.game.errors
		let H = this.game.hints
		let nsec = this.game.nseconds
		let perfect = ( E == 0 && H == 0 )
		
		this.UserStats[ this.currDiff ].cCnt++	// add to count by difficulty
		this.UserStats[ this.currDiff ].cStrk++	// add to streak by difficulty

		gSt.completeCnt++
		gSt.Cnt[E][H]++	// add to count by E & H
		let moreErrCnt = 0
		for (let i= E+1; i<3; i++)
			for ( let j = 0; j<3; j++ )
				moreErrCnt += gSt.Cnt[i][j]
		this.pctMoreErrs = ( moreErrCnt*100 ) / gSt.completeCnt

		let moreHintCnt = 0
		for (let i= H+1; i<3; i++)
			for ( let j = 0; j<3; j++ )
				moreHintCnt += gSt.Cnt[j][i]
		this.pctMoreHints = ( moreHintCnt*100 ) / gSt.completeCnt
		
		let prevBest = ''
		this.newRecord = ''
		if ( perfect ){   // perfect game
			gSt.perfectCnt++		// add to game perfect count
			
			if ( gSt.firstDate == '' ){  // first perfect win
				gSt.firstDate = dayjs().format('YYYY-MMM-DD')
				gSt.bestTime = nsec
				gSt.bestUsers = [ this.userID ]
				this.userRecords.numFirsts++
				this.userRecords.numBests++
				this.newRecord = `First to perfectly complete ${this.gameID}!`
				
			} else if ( nsec < gSt.bestTime ){
				prevBest = gSt.bestUsers[ gSt.bestUsers.length-1 ]	// userID of previous best
				
				gSt.bestTime = nsec
				gSt.bestUsers.push( this.userID )
				this.userRecords.numBests++
				this.newRecord = `New best time for ${this.gameID}!`
			}
			
			this.UserStats[ this.currDiff ].pCnt++	// add to difficulty perfect count
			this.UserStats[ this.currDiff ].pStrk++	// add to perfect streak
		
			let fasterCnt = this.incBin( nsec )	// add to bin by speed
			let totPerfect = gSt.Cnt[0][0]
			this.pctSlower = (totPerfect - fasterCnt)*100/totPerfect   // total-faster == slower
		} else {
			this.UserStats[ this.currDiff ].pStrk = 0	// perfect streak broken
		}	
		this.showCompleted( perfect )
		
		// update game stats => kvdb
		this.setDBObj( this.gameID, this.gmdef )
		
		// update user stats => localStorage
		localStorage.setItem( 'UserStats', JSON.stringify( this.UserStats ) )
		
		if ( this.newRecord != '' ){	// update userRecord at DB
			this.setDBObj( this.userID, this.userRecords )
			if ( prevBest != '' )
				this.decrBests( prevBest )
		}
	}
	
	async getDBObj( key, defval ){
		let val = defval
		try {
			let objstr = await this.bucket.get( key )
			val = JSON.parse( objstr )
		} catch(err){ 
			console.log( `getDBObj: setting default` )
			this.setDBObj( key, defval )
		}
		return val
	}
	async setDBObj( id, val ){	// write JSON val to DB[ id ]
		await this.bucket.set( id, JSON.stringify( val ))
	}
	async decrBests( uid ){	// get user records for uid & decrement numBests
		let uStats = await this.getDBObj( uid )
		uStats.numBests--
		this.setDBObj( uid, uStats )
	}

	showGames(evt){			// show popup window with game stats
		evt.stopPropagation()
		if ( !HUI.hasClass( 'Popup', 'hide' )){
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
				html += `  ${st.format('H:mm')} ${gm.name} ${end.diff(st,'minute',true).toFixed(1)}m  &nbsp;&nbsp; Score:${gm.score} <br>`
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

//******  UI for clicks, touches, key commands
	gridClick( evt ) {			// cell left click, or right (mark)
		HUI.setClass( 'Popup', 'hide', true )
		this.clearSel()
		if ( this.gameIsOver ) return
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
	doGridClick( y, x, safe ){	// click cell -- clear or explode
		let cid = this.gID(y,x)
		if ( !HUI.hasClass( cid, 'secret' ) || this.gameIsOver ) return
		
		if (this.game.start==undefined){
			this.game.start = dayjs().format('YYYY-MM-DD HH:mm:ss')
			this.game.nMoves = 0
		}
		this.game.nMoves++
		if ( this.grid[y][x] < 0 ){	//detonate mine
			if ( this.dbg.getVal( 'PropExp' ) ){
				this.explodeStep( y,x, true )
			} else {
				if ( !HUI.hasClass( cid, 'exploded' ) )
					this.explodeCell( y,x, true )
			}
			return
		}
		
		this.clearCell( y, x, safe, true )
		if ( this.grid[y][x]==0){  // auto-spread clearing
			this.spreadClear( y,x, safe )
		}
		this.showCnts()
	}
	spreadClear( y,x, safe ){	// spread click on 0 out to borders of island
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
	explodeStep( y,x, user ){	// propagate exploding cell
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

	touchmove( evt ){		// touch evt
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
	touchstart( evt ) {		// touch evt
		//msg( `T${evt.touches.length} ${evt.target.id}` )
		this.clearSel()
		this.clearTouch()
		if ( evt.touches.length > 1 ){
			this.touchZooming = true 
			evt.preventDefault()
			//msg( 'TZ', true )
		} else
			this.longtouchtimer = setTimeout( this.onlongtouch.bind(this,evt), this.touchduration ); 
	}
	clearTouch(){			// touch evt
		if (this.longtouchtimer != 0){
			clearTimeout( this.longtouchtimer ) 
			this.longtouchtimer = 0
		}
	}
	touchend( evt ) {		// touch evt
		this.clearTouch() //stops short touches from firing the event
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
		evt.preventDefault()
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		this.doGridClick( y, x, false )
	}
	onlongtouch( evt ){		// touch evt
		this.longtouchtimer = 0
		let tgt = evt.target;
		if ( !tgt.id.startsWith('m') || tgt.id.length != 5) return
		if ( !HUI.hasClass( tgt, 'secret') && !HUI.hasClass( tgt, 'marked' ) ) return
		let y = Number(tgt.id.substr(1,2)), x = Number(tgt.id.substr(3,4))
		navigator.vibrate( 60 )
		this.markCell( y, x )
		evt.preventDefault()
	}
	updatePos(){			// simulating touch: adj from controls
		let zm = this.dbg.getVal('zm:')
		let dx = this.dbg.getVal('dx:')
		let dy = this.dbg.getVal('dy:')
		this.setZoom( zm, dy, dx )
	}	
	setZoom( zm, dy,dx ){	// set screen zoom
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
		
		if ( this.dbg.getVal( 'TM' ) ) 
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

	keydown( evt ){			// key: cmds to select & click
		let y = this.selY
		let x = this.selX
		switch ( evt.key ){
			case '*':
				if ( evt.ctrlKey && evt.altKey ) 
					HUI.setClass( 'guiG0', 'hide' )
				break
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
				//this.randSafeClick()
				return
			case 'r':
				//this.resetField()
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
	clearSel(){				// key: clear keybd selection
		if ( this.selY == undefined || this.selX == undefined ) return
		HUI.setClass( this.gID( this.selY, this.selX ), ['sel','hint'], false )		
	}
	selCell( y, x, hint ){		// key: select cell
		this.clearSel()
		this.selY = y
		this.selX = x
		HUI.setClass( this.gID( this.selY, this.selX ), hint? 'hint':'sel', true )
	}

//*************** hidden abilities
	play( dly ){			// auto-play from current state
		if ( dly==undefined ) dly = 10
		this.game.unm = 'Auto'
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
	playStep( dly ){		// find a move and play it
		while ( this.toDo.length > 0 && this.cntSinceChg < this.toDo.length*3 ){
			let c = this.toDo.pop()
			let ev = this.evalCell( c, true )	// => null or { y: x: nmines: marked: secret:[] }
			
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
	markProcessed( yOrId, x ){ // set as 'processed' to visually mark
		let id = x==undefined? yOrId : this.gID( yOrId, x )
		
		if ( HUI.hasClass( id, 'bombed' ))
			HUI.setClass( id, 'procbombed', true )
		else
			HUI.setClass( id, 'processed', true )
			
		HUI.setClass( id, ['cleared','freed','bombed','tm','t0','t1','t2','t3','t4','t5','t6','t7','t8'], false )
	}
	playCell( e ){			// auto-click or mark neighbors 
		if ( e.nmines < 0) debugger  // cleared mine!
		let secret = e.secret.length
		let nhidden = e.nmines - e.marked
		if ( nhidden > 0 && secret != nhidden ) 
			return false 		// not enough info yet
		
		this.markProcessed( e.y, e.x )
		this.processed[ e.y ][ e.x ] = true
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
	unplayLast(){			// undo changes from last user move
		while ( this.gamesteps.length > 0 ){
			let mv = this.gamesteps.pop()
			this.unplay( mv.y, mv.x )
			if ( mv.user ){
				this.selCell( mv.y, mv.x )
				return
			}
		}
	}
	addMove( y,x, user ){	// record a game state change
		this.gamesteps.push( { x: x, y: y, user: user } )
	}
	unplay( y,x ){  		// revert a change to game state
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
	randSafeClick(){		// click a random 0 cell
		while (this.blanks.length > 0){
			let r = Math.floor( this.rand() * this.blanks.length )
			let [y,x] = this.blanks[r]
			if ( HUI.hasClass( this.gID(y,x), 'secret' )){
				this.safeClicks.push( [y,x] )
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
	
//*************** offline calculations
	genGame( num, nsafe ){		// generate random game for 'num', using XYSize & Pct
		let rkey = `CF_Gm${num}`
		this.gameName = `CF_Gm${num}-${nsafe}`
		this.gameNum = num
		//this.opt.setVal( 'Game', num )
		this.XSize = this.gui.getVal('X')
		this.YSize = this.gui.getVal('Y')
		this.Density = this.gui.getVal('Mine%')/100
		this.initCurrGame()
		
		this.initRand( rkey )		
		this.initUIstate()	// reset UI & html state for new game

		this.fillField( this.Density )	
		for (let i=0; i< this.numSafe; i++){
			this.usedFree = false
			this.randSafeClick()
		}
		this.showCnts()		// so defined at end
		
		for ( let i=0; i<nsafe; i++ )
			this.randSafeClick()
	}
	fillField( pct ){			// generate game grid based on random #gen
		const cellTxt = [ '*',     '',   '1',   '2',   '3',   '4',   '5',   '6',  '7',    '8',  '9' ]		

		let xc = this.XSize
		let yc = this.YSize
		this.resetGrid( )
		
		for (let y=0; y<yc; y++){
			this.grid[ y ] = []
			this.processed[ y ] = []
			for (let x=0; x < xc; x++){
				this.processed[ y ][ x ] = false
				if ( this.rand() < pct ){
					this.grid[y][x] = -1
				} else {
					this.grid[y][x] = 0
				}
			}
		}
		// count #mines adjacent to each cell
		for (let y=0; y<yc; y++)	
			for (let x=0; x<xc; x++)
				if (this.grid[y][x] >= 0){	// not a mine
					for (let ny=y-1; ny<y+2; ny++)
						for (let nx=x-1; nx<x+2; nx++){
							if ( this.grid[ny][nx] == -1 )  // indexing past edge gets undefined, so not a mine
								this.grid[y][x]++		// count the mines
						}
				}
				
		let html = ''
		this.secret = xc * yc
		for (let y=0; y<yc; y++){
			for (let x=0; x<xc; x++){
				let idx = this.grid[y][x]+1		// 0..9
				let id = this.gID(y,x)
				if ( this.grid[y][x] < 0 ) 
					this.mines++			// count mines
				if ( this.grid[y][x]==0 ) 
					this.blanks.push( [ y,x ] )	// list of blank cells
				html += `<span id="${id}" class="grd secret"> ${cellTxt[idx]} </span>`
			} 
			html += '<br>';
		}
		HUI.gEl('data').innerHTML = html;
	}
	findWinnable(){  			// eval games from 'GmStart'..+Batch & sv winnable games as 'XGxxxx'
		this.showPanels( 'Playing', 'data' )
		let gmnum = Number( this.mng.getVal( 'GmStart' ))
		let mxG = gmnum + Number( this.mng.getVal('Batch') )
		this.mng.setVal( 'GmStart', mxG )
		async function evalGameLoop(){
			this.maxGms.seed = gmnum
			await this.evalGame( gmnum )
			gmnum++
			if ( gmnum < mxG )
				setTimeout( evalGameLoop.bind(this), 100 )
		}
		setTimeout( evalGameLoop.bind(this), 100 )	
	}
	evalGame( num ){  			// find lowest sequence of 'free clicks' that results in winnable game
		this.genGame( num, 0 )
		let maxSafe = 0
		while ( this.randSafeClick() ) 	// fails if no more 0 cells
			maxSafe++
		
		let lowestwinnable = -1
		for ( let nRS = maxSafe; nRS >= 0; nRS-- ){
			this.genGame( num, nRS )
		
			this.PlayTest = true
			this.play( 0 )				// see if this config is winnable
			this.PlayTest = false
			
			if ( this.secret == 0 ) 
				lowestwinnable = nRS
			else
				break   // found a non-winnable version
		}
		if ( lowestwinnable < 0 ){
			msg( `Game ${num}-${maxSafe} non-winnable`)
			if ( num > this.maxunwinnable ) 
				this.maxunwinnable = num
		} else {
			this.calcQuest( num, lowestwinnable )	// mark non-essential cells as '?' & save game
			msg( `Game ${num}-${lowestwinnable} is winnable` )
		}
	}
	calcQuest( gmnum, nsafe ){  // play game & put non-critical ('?') cells in quests[]
		this.genGame( gmnum, nsafe )
		
		this.PlayTest = true	// disable game recording & UI
		this.play( 0 ) // play game & mark cells not needed to win as '?'
		this.clearSel()
		this.PlayTest = false
		let classes = [
			'cleared','freed','bombed','marked','processed', 
			'tm','t0','t1','t2','t3','t4','t5','t6','t7','t8'
		]
		// remember ? cells & reset to secret for initial state
		this.quests = []
		for (let y=0; y<this.YSize; y++)
			for (let x=0; x<this.XSize; x++){
				let id = this.gID( y, x )
				if ( HUI.gEl(id).innerText=='?' ) 
					this.quests.push( [ y,x ] )
			}
	
		this.genGame( gmnum, nsafe )	// reset to game start
		for ( let qst of this.quests )
			HUI.gEl( this.gID( qst[0], qst[1] )).innerText = '?'	// and add ?'s

		this.saveGame() // save state as G000${this.nxtG}
	}
	gameState(){				// => encoded state of cells as string []
		let st = []
		let encoder = Array.from( this.gridEncode )
		for ( let y=0; y < this.YSize; y++ ){
			let s = ''
			for ( let x=0; x < this.XSize; x++ ){
				let gval = this.grid[y][x]
				let id = this.gID(y,x)
				let isQuest = HUI.gEl( id ).innerText.trim()=='?'
				let isSecret = HUI.hasClass( id, 'secret' )
				// idx = (this.grid[y][x]+1) * ((innerText=='?' 1 : 2 ) + (hasClass('secret')? 2 : 0) )
				let idx = gval+1			// !Q !S => 0..9
				if ( isQuest ) idx += 10	// Q !S  => 10..19
				if ( isSecret ) idx += 20	// !Q S => 20..29,  Q S => 30..39
				
				s += encoder[ idx ]
			}
			st.push( s )
		}
		return st
	}
	saveGame( ){  				// save current game state to DB as this.gameID
		let gmdef = { 
			id: this.gameID, G: this.gameName, GNum: this.gameNum, 
			nS: this.secret, nQ: this.quests.length, 
			XSz: this.XSize, YSz: this.YSize, st: this.gameState(),
			Stats: {   // game stats updated by each winner
				bestTime: this.game.nseconds,
				bestUsers: [],
				firstDate: '',
				Bins: [],			// cnts of 0E0H games by time
			
				completeCnt: 0,		// total times game completed 
				perfectCnt:  0,		// total OEOH completions
			
				Cnt: [  [ 0, 0, 0 ], // 0E cnts by H (0,1,2)
						[ 0, 0, 0 ], // 1E cnts by H
						[ 0, 0, 0 ]  // 2E cnts by H
					]
			}
		}

		// approx game difficulty by number of secret cells
		const diffCnt = [ [ 100, 'E'], [ 200, 'M'], [ 262, 'H' ], [ 1000, 'X' ] ]
		if ( this.XSize * this.YSize < 400 )
			gmdef.diff = 'E'
		else {
			for ( let cntCls of diffCnt )
				if ( gmdef.nS <= cntCls[0] ){
					gmdef.diff = cntCls[1]
					break
				}
		}

		let nxtCnt = this.maxGms[ gmdef.diff ]
		gmdef.id = `${gmdef.diff}${this.pad4(nxtCnt)}`
		this.maxGms[ gmdef.diff ]++
		
		this.setGameDB( gmdef )
		msg( `Saved ${gmdef.id}` )
		console.log( `Saved ${gmdef.id}` )
		
		this.loadGameDef( gmdef )		
	}
	async setGameDB( gmdef ){	// write gmdef to KVdb
		await this.bucket.set( gmdef.id, JSON.stringify( gmdef ))
		await this.bucket.set( 'maxGms', JSON.stringify( this.maxGms ) )
	}

}
var jsApp = new App( 'ClearField  Jul2023.01' )
