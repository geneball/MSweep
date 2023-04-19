	import { asBStr, asTxt, asChrs, padSpc, O, H, CH, I  } 		from './fmt.js'
	import { msg } from './msg.js'
	import { HUI } from './htmlui.js'
	import { App } from './app.js'
	import { saveAs } from 'file-saver'
	import { AltoInstr } from './altoinst.js'
	
class Sym{
	static staticSyms = {} // Sym's keyed by static addr
	static frameSyms = {}  // Sym's keyed by frame offset
	static regSyms = {}		// Sym's keyed by reg 0..5
	static vecSyms = {}		// vec Sym's keyed by frame start
	static run
	
	constructor( kind, addr, typ ){
	//	this.SS = Sym.staticSyms
	//	this.FS = Sym.frameSyms
		if ( typ == undefined ) typ = 'int_t'
		this.kind = kind
		this.typ = typ
		this.addr = addr
		this.declared = false
		
		switch ( kind ){
			case 'sVar':  
			case 'func':
				Sym.staticSyms[ addr ] = this
				let sidx = Sym.run.staticIdx( addr )
				this.nm = Sym.run.staticNm( addr )
				if ( kind=='func' ){
					this.nm = `P${sidx}`
					this.typ = 'void'
					this.maxargs = 0
					this.argtyps = []
				}
				this.val = this.nm
				break
						
			case 'arg':
			case 'var':
			case 'tmp':
				Sym.frameSyms[addr] = this
				this.nm = kind.charAt(0)+ `${addr}`
				break
				
			case 'vec':
				Sym.vecSyms[addr] = this
				this.nm = `vec${addr}[]` 
				this.addr = addr
				this.typ = 'arr_t'
				this.len = 0  // don't know how long
				break
				
				
				
			case 'reg':
				Sym.regSyms[addr] = this
				this.nm = `r${addr}`
				break

			default: debugger
		}
	}
	dbg(){
		let txt = `{${this.kind}: ${this.typ} ${this.nm}[${this.addr}] = ${this.val? this.val:''}}`
		return txt
	}
	getVal(){
		if ( this.val == undefined ) 
			this.val = this.nm
		if ( typeof this.val != 'string' ) 
			this.val = this.val.toString()
		if ( this.procIdx != undefined ){ // using function result-- clear procedure call
			Sym.run.clearC( Sym.run.currPrc, this.procIdx )
			this.prcIdx = undefined
		}
		return this.val
	}
	static clearReg( reg ){		// called to clear R0 as dest reg of ALC, before using it
		if ( reg==0 && Sym.regSyms[0].procIdx != undefined )
			Sym.regSyms[0].procIdx = undefined
	}
	getTrimmed(){
		let v = this.getVal().trim()
		if ( v.startsWith( '(' ))
			v = v.substring(1, v.length-1).trim()
		return v
	}
	asDecl( argDef ){
		if (argDef==undefined) argDef = false
		if ( this.kind=='vec' ) return `${this.typ}[${this.len}]`
		let typ = '' 
		if ( !this.declared ){
			if ( argDef || !this.nm.startsWith('a')){	// only decl args when argDef passed
				typ = this.typ + ' '
				this.declared = true
			}
		}
		return `${typ}${this.nm}`
	}
	asInt(){
		if ( this.val )
			return parseInt( this.val )
	}
	asVec( prc ){	// sym val of form '( x + fp )' => Sym.Vec()
		let v = this.val.trim()
		if (v.startsWith('(')) v = v.substring(1,v.length-2).trim()
		if ( v.endsWith('+ fp')) v = v.substring(0, v.length-4).trim()
		let frmoff = parseInt( v )
		let symvec = Sym.Vec( frmoff, prc.framesiz-1 - frmoff )
		symvec.val = `[ ${symvec.len} ]`
		return symvec
	}
	asFnCall( nargs ){	// => C call to this Fn, with 'nargs' in Regs & stack 
		if ( this.kind == 'sVar' ){ // call to extern
			this.kind = 'func'
			this.typ = 'void'
			this.maxargs = 0
			this.argtyps = []
		}
		if ( nargs > this.maxargs ) 
			this.maxargs = nargs
		let call = `${this.nm}(`
		let arg3 = Sym.Reg(4)		// arg3 if exactly 3
		let frArgs = 0
		if ( nargs > 3 ) 
			frArgs = arg3.asInt() // args 3..N are in frame at frArgs+3..+N
		for ( let i=0; i<nargs; i++ ){
			let arg = i<2? Sym.Reg(i) : nargs==3? arg3 : Sym.FVar( frArgs+1+i )		// +1 matches generated code
			call += ` ${arg.getVal()},`
			this.argtyps[i] = arg.typ
		}
		return call.substring(0,call.length-1) + ' )'
	}
	toString(){
		return this.nm
	}
	static getArgs(){
		let res = []
		for ( let f in Sym.frameSyms ){
			if ( Sym.frameSyms[f].nm.startsWith('a') )
				res.push( Sym.frameSyms[f] )
		}
		return res
	}
	static show( idx, a ){
		let txt = `${idx} ${a.asm} `
		for ( let s in Sym.regSyms ){
			let sym = Sym.regSyms[s]
			txt += sym.dbg()
		}
		console.log( txt )
	}
	static initFrame(){
		Sym.frameSyms = {}
		new Sym( 'tmp', 0 )
		new Sym( 'tmp', 1 )
		new Sym( 'tmp', 2 )
		new Sym( 'tmp', 3 )
		
		Sym.regSyms = {}
		Sym.SetReg( 0, 'nargs', 	'int_t' )
		Sym.SetReg( 2, 'fp', 		'arr_t' )
		Sym.SetReg( 3, 'retAddr', 	'arr_t' )
	}
	static SVar( saddr, typ, nm ){	// static var
		let sym = this.staticSyms[ saddr ]
		if ( sym == undefined ) sym = new Sym( 'sVar', saddr, typ )
		if ( typeof typ == 'string' ) sym.typ = typ
		if ( typeof nm == 'string' ) sym.nm = nm
		return sym
	}
	static SFunc( saddr, nm, typ ){	// Static function pointer
		let sym = Sym.staticSyms[ saddr ]
		if ( sym == undefined ) sym = new Sym( 'func', saddr, typ )
		if ( typeof nm == 'string' ) sym.nm = nm
		if ( typeof typ == 'string' ) sym.typ = typ
		return sym
	}
	static FVar( offset, typ ){	// FrameVar
		let sym = Sym.frameSyms[ offset ]
		if ( sym == undefined ) sym = new Sym( 'var', offset, typ )
		if ( typeof typ == 'string' ) sym.typ = typ
		return sym
	}
	static Vec( vecoffset, maxsiz ){	// pointer into frame (vec)
		let sym = Sym.frameSyms[ vecoffset ]
		if ( sym == undefined ) sym = new Sym( 'vec', vecoffset, 'arr_t' )
		sym.len = maxsiz   // may get adjusted down
		for ( let s in Sym.frameSyms ){
			let vec = Sym.frameSyms[s]
			if ( vec.addr < vecoffset && (vec.addr+vec.len > vecoffset)) // shortened by this vec
				vec.len = vecoffset - vec.addr
		}
		return sym
	}
	static AVar( offset, typ ){	// Arg
		let sym = Sym.frameSyms[ offset ]
		if ( sym == undefined ) sym = new Sym( 'arg', offset, typ )
		if ( typeof typ == 'string' ) sym.typ = typ
		return sym
	}
	static Reg( idx, typ ){		// Register
		let sym = Sym.regSyms[ idx ]
		if ( sym == undefined ) sym = new Sym( 'reg', idx, typ )
		if ( typeof typ == 'string' ) sym.typ = typ
		return sym
	}
	static RegV( reg ){
		return Sym.Reg( reg ).getVal()
	}
	static clrReg( reg ){
		let sym = Sym.Reg( reg )
		sym.val = ''
	}
	static SetReg( idx, val, typ ){		// Register
		let sym = Sym.Reg( idx, typ )
		sym.procIdx = undefined
		if ( val == undefined ) val = ''
		if (val instanceof Sym){
			sym.typ = val.typ
			sym.val = val.val
		} else {
			sym.val = val
			if ( typeof typ == 'string' ) sym.typ = typ
		}
		return sym
	}
	static asStatic( saddr ){
		let sym = this.staticSyms[ saddr ]
		if ( sym == undefined ) return ''
		if ( sym.kind=='sVar' )
			return `${sym.typ} ${sym.nm}; <br>`
		else if ( sym.kind=='func' ){
			let args = ''
			for ( let a of sym.argtyps ) args += ` ${a},`
			return `extern ${sym.typ} ${sym.nm}( ${args.substring(0,args.length-1)} ); <br>`
		}
	}
}

export class AltoRun {
	constructor( nm, classifier ){
		this.classifier = classifier
		this.verbose = true
		this.AI =  new AltoInstr()
		fetch( './sysMap.json').then((response) => response.json()).then((json) => this.initSyms( json ) )
	}
	tglVerbose( ){
		this.verbose = !this.verbose
		let vb = [ 'lengthInPages', 'overlayAddress', 'afterLastCodeWord','relPairTable','ovlyType',
					'blank', 'pg0unused', 'pg0copy' ]
		for (let nm of vb)
			this.classifier.gui.showVal(nm)
	}
	initSyms( json ){
		this.syms = json
		let byAddr = {}, byLink = {}, byPage0 = {}
		/*
		"bcplRT":	{	"LQ0":    { "page0": "300",   "addr": "300" },
		"bcplCONST":{	"Zero":		{ "addr": "352", "value": 0 },
		"bcplVAR":	{	"StackLimit":	{ "addr": "335" }
		"osLink":	{	"Ws": 			{ "idx": 4,		"addr": "0146325" },
		*/
		for ( let g of ['bcplRT', 'bcplCONST', 'bcplVAR', 'osVar', 'osLink', 'progVAR', 'proc' ] ){
			let sect = this.syms[ g ]
			if ( sect ){
				for ( let s of Object.getOwnPropertyNames( sect )){
					let sym = sect[s]
					if ( typeof sym.addr=='string' )
						sym.addr = parseInt( sym.addr, 8 )
					if ( typeof sym.value=='string' ) 
						sym.value = parseInt( sym.value, 8 )
					if ( typeof sym.page0=='string' )
						byPage0[ parseInt( sym.page0, 8 ) ] = { nm: s, addr: sym.addr }
					byAddr[sym.addr] = s
					if ( typeof sym.idx == 'string' )	// osLink entry
						byLink[ parseInt(sym.idx,8) ] = { nm: s, addr: sym.addr }
				}
			}
		}
		this.symByAddr = byAddr
		this.symByPage0 = byPage0
		this.symByLink = byLink
		this.SV = this.asSV( this.classifier )
	}
	asBLV( cls ){	
		/*
		//----------------------------------------------------------------------------
		structure BLV:		// Bcpl Layout Vector - passed to program on startup
		//----------------------------------------------------------------------------
		[
		overlayAddress^0, 25 word
		startOfStatics word	// address of first static
		endOfStatics word	// address of last static
		startOfCode word	// address of first word of code
		afterLastCodeWord word	// 1 + largest address at which code is loaded
					//  (normally endCode is the same, and the system
					//  treats that value as the end of the program)
		endCode word		// first location which may be used for data; 
					//  used by the system to set EndCode
		relPairTable word	// /I switch: address in code area for table
		]
		manifest lBLV = size BLV/16
		*/
		cls.defFld( 'overlayAddress',		[ 0, 25 ] )		
		cls.defFld( 'startOfStatics',		[ 26 ], 'b12', true )		
		cls.defFld( 'endOfStatics',			[ 27 ], 'b12', true )				
		cls.defFld( 'startOfCode',			[ 28 ], 'b10', true )				
		cls.defFld( 'afterLastCodeWord',	[ 29 ] )		
		cls.defFld( 'endCode',				[ 30 ], 'b10', true )		
		cls.defFld( 'relPairTable',			[ 31 ] )		
		return cls
	}
	asSV( cls ){
		/*	structure SV:		// Format of an Alto RUN (save) file
		[
		H:			// This is a mangled BBHeader
		   [
		0:   startingAddress word	// Initial value for PC = SV.BLV.startOfCode
		1:   length word		// # full pages up to afterLastCodeWord
		2:   type word		// = 0: resident code has type A overlay format
		3:   nStaticLinks word	// # static links after afterLastCodeWord
		4..13:   blank^2, 11 word
		   ]
		14..45: BLV @BLV		// Bcpl layout vector
		46: page0^0, 277b word	// The first 16b words are ignored; the rest are 
					//  used to set words 16b to 277b of memory
		46..59 -- skip
		60: page0^15,191  copy 60..237 = 178 words to mem[14..191]
		statics^0, 0 word	// Actually there are (BLV.endOfStatics-
					//  BLV.startOfStatics + 1) words here
		code^0, 0 word		// Actually there are (BLV.endCode- 
					//  BLV.startOfCode) words here
		end word
		]		*/

		cls.defFld( 'startingAddr',		0 )		
		cls.defFld( 'lengthInPages',	1 )
		cls.defFld( 'ovlyType',			2 )
		cls.defFld( 'nStaticLinks',		3, 'b14', true )
		cls.defFld( 'blank', 			[ 4, 14 ] )
		this.BLV = this.asBLV( cls.defData( 'BLV', 	[ 14, 14+32 ], '', true ))
		cls.gui.addBreak()
		cls.defFld( 'pg0unused', 		[ 46, 46+13 ] )
		cls.defFld( 'pg0copy', 			[ 46+14, 46+190 ] )
		
		let nStaticLinks = cls.val( 'nStaticLinks' )
		this.startOfStatics = this.BLV.val('startOfStatics')
		let nStatics = 	this.BLV.val('endOfStatics') - this.startOfStatics +1
		this.startOfCode = this.BLV.val('startOfCode')
		this.endCode = this.BLV.val('endCode')
		let nCode = this.endCode - this.startOfCode
		let stOff = this.fileStaticsStart= 46 + 192   
		let cdOff = this.fileCodeStart = stOff + nStatics
		let lnkOff = cls.data.length - nStaticLinks
		msg( `nStatics = ${nStatics} @${H(stOff)}  nCode = ${nCode} @${H(cdOff)}` )

		//cls.defFld( 'statics', 		[ stOff, stOff + nStatics-1 ], 'b12', true )
		let scls = cls.defData( 'statics', [ stOff, stOff + nStatics-1  ], 'b12', true ) 
		this.statics = cls.val('statics')	// array of static locations
		this.staticNms = {}
		
		cls.gui.addBreak()
		let ccls = cls.defData( 'code', [ cdOff, cdOff + nCode-1 ], 'b10', true ) 		
		this.code = cls.val( 'code' )	// code array within run file

		cls.gui.addBreak()
		cls.defFld( 'staticLinks',  [ lnkOff, lnkOff + nStaticLinks ], 'b14' )
		
		let staticAddrs = cls.val('staticLinks') // array of static addresses to link
		let staticLinks = []
		for ( let i=0; i<nStaticLinks; i++ ) // build list of statics that are links
			staticLinks.push( staticAddrs[i]- this.startOfStatics )

		Sym.run = this
		
		this.bitfields = {}
		this.bitfieldStructs = {}  //indexed by structnm
		this.procs = []
		this.staticdecls = []
		for ( let i=0; i<nStatics; i++ ){ // idx within statics
			let sA = this.startOfStatics + i
			let nm = this.staticNm( sA )
			if ( staticLinks.includes( i )){  // this static is an OS link
				let stIdx = this.statics[ i ]
				let lnk = this.symByLink? this.symByLink[ stIdx ] : undefined
				if ( lnk == undefined ){
					nm = `L${i}`
					scls.defFld( nm, i, 'e06' )
				} else {
					nm = lnk.nm
					scls.defFld( lnk.nm, i, 'e05' )
				}
				Sym.SVar( sA, 0, nm )
			} else if ( this.isCodeAddr( this.statics[i] )){ 
				nm = this.procs.length==0? `main` : `P${i}`
				this.procs.push( { nm: nm, staticIdx: i, entryIdx: this.codeIdx( this.statics[i] ) } )
				Sym.SFunc( sA, nm, 'void' )
			}
			this.staticNms[sA] = { idx: i, addr: sA, nm: nm }
		}
		for (let prc of this.procs )
			this.defineProc( prc, prc.staticIdx, scls, ccls )	// traverse & decode
		for ( let i=0; i<nStatics; i++ ){	// declare static vars & externs
			let decl = Sym.asStatic( this.startOfStatics + i )
			if ( decl != '' ) this.staticdecls.push( decl )
		}
		this.tglVerbose()
		App.Refresh()
		return cls
	}
	isCodeAddr( codeAddr ){ 
		let incd = (codeAddr >= this.startOfCode)
		return incd && (codeAddr <=  this.endCode)
	}
	codeIdx( codeAddr ){ return codeAddr - this.startOfCode }
	staticIdx( sA ){ return sA - this.startOfStatics }
	staticNm( sA ){ 
		let e = this.staticNms[ sA ]
		return e==undefined? `S${this.staticIdx(sA)}` : e.nm
	}
	staticVarNm( sA ){
		let e = this.staticNms[ sA ]
		if ( e!=undefined ) e.nm = `S${this.staticIdx(sA)}`
		return this.staticNm( sA )
	}
	defineProc( prc, iStatic, scls, ccls ){
	//	let num = this.procs.length+1
	//	let iEntry = this.codeIdx( this.statics[ iStatic ] )
	//	let prc = { nm: `P${num}`, staticIdx: iStatic, entryIdx: iEntry, 
	//				Labs: {}, ops: {}, ccode: {}, iEnd: iEntry } 
	//	this.procs.push( prc )
		prc.Labs = {}
		prc.ops = {}
		prc.tests = []
		prc.ccode = {}
		prc.vccode = {}
		prc.control = [ prc.nm ]
		prc.nest = 0
		prc.frm = [ 'retAddr', 'tmp1', 'tmp2', 'tmp3' ]	//initFrame
		Sym.initFrame()
		let iEntry = prc.entryIdx
		
		scls.defFld( prc.nm, iStatic, 'b18' )
		let frm = this.code[ iEntry+2 ]
		
		prc.nest++
		prc.framesiz = frm
		prc.ops[iEntry] = { idx: iEntry, inst: { asm: '' }}
		this.initTodo( prc )
		this.addTodo( iEntry+4 )
		prc.vecs = []	// frame indices allocated as vecs
		prc.reg = [ 'nargs', '', 'fp', '', 'tmp' ]	//initFrame
		let sA = this.startOfStatics + iStatic
		prc.procSym = Sym.SFunc( sA )
		while (true){
			let icd = this.nxtTodo()
			if ( icd == undefined ) break // traverse all reachable instructions
			this.interpInstr( prc, icd )
		}
		prc.nest--
		
		let symfn = `${prc.procSym.asDecl()}( `
		for ( let a of Sym.getArgs() ){		// add args: referenced before they were written
			symfn += ` ${a.asDecl( true )},`
		}
		this.addC( prc, iEntry, symfn.substring(0,symfn.length-1) + ' ){' )
		this.addC( prc, prc.iEnd, '}' )
		
		let pcls = ccls.defData( `${prc.nm}()`, [ iEntry, prc.iEnd ], 'b18', false )
		ccls.gui.addBreak()
		pcls.gui.addLine( '', `FrmSiz: ${frm}` )
		pcls.gui.addButton('showCd', ()=>{ this.showProc( prc,  this.verbose )} )
		for ( let iL in prc.Labs ){
			let lab = prc.Labs[ iL ]
			if ( lab.typ=='loop' ){
				pcls.defFld( `Lp${lab.lpTop}Body`, [ lab.lpTop-iEntry, lab.lpTest-iEntry-1 ], 'b11' )
				pcls.defFld( `Lp${lab.lpTop}Test`, [ lab.lpTest-iEntry, lab.lpEnd-iEntry ], 'b12' )
			} else if ( lab.typ=='ifThen' ){
				pcls.defFld( `If${lab.skip}Skip`, [ lab.skip-iEntry ], 'b13' )
				if ( lab.afterThen ){
					pcls.defFld( `Then${lab.skip}`, [ lab.skip+1-iEntry, lab.afterThen-1-iEntry ], 'b14' )
					pcls.defFld( `Else${lab.skip}`, [ lab.afterThen-iEntry, lab.afterTest-1-iEntry ], 'b15' )
				} else 
					pcls.defFld( `Then${lab.skip}`, [ lab.skip+1-iEntry, lab.afterTest-1-iEntry ], 'b14' )
			} else if ( lab.typ=='Branch' ){
				pcls.defFld( `Branch${lab.start}`, [ lab.start-iEntry, lab.end-1-iEntry ], 'b16' )
			} else if ( lab.typ=='Lookup' ){
				pcls.defFld( `Lkup${lab.start}`, [ lab.start-iEntry, lab.end-1-iEntry ], 'b16' )
			}
		}
		pcls.gui.addBreak()
	}
	initTodo( prc ){
		prc.todo = []
		prc.visited = []
		prc.prcInstrCnt = 0
		prc.iEnd = 0
		this.currPrc = prc
	}
	addTodo( cdaddr ){
		if ( cdaddr >= 0 && cdaddr < this.code.length )
			this.currPrc.todo.push( cdaddr )
		else {
			let prc = this.currPrc
			console.log( `Todo bad addr: ${cdaddr} in ${prc.nm}${prc.iEntry} of 0..${this.code.length}` )
		}
	}
	nxtTodo(){
		let prc = this.currPrc 
		if ( prc.todo.length == 0 ) return undefined
		prc.prcInstrCnt++
		if ( prc.prcInstrCnt > 200 ) debugger
		
		let nxt = this.popMin( prc.todo ) //	get min value todo
		while ( prc.visited.includes( nxt ))
			nxt = this.popMin( prc.todo )	// skip already visited instructions
		
		prc.visited.push( nxt )		// about to visit it
		if ( nxt > prc.iEnd ) prc.iEnd = nxt
		return nxt
	}
	popMin( arr ){
		let min = arr[0], iMin = 0
		for ( let i=1; i<arr.length; i++ )
			if ( arr[i] < min ){
				min = arr[i]
				iMin = i
			}
		arr.splice( iMin, 1 )	// delete iMin
		return min
	}
	addC( prc, icd, code, ahead ){
		let nest = ''.padStart( prc.nest*4, ' ' )
	//	console.log( `addC: ${code}` )
		if ( prc.ccode[ icd ] == undefined )
			prc.ccode[ icd ] = nest + code
		else
			if ( ahead )
				prc.ccode[ icd ] = nest + code + '<br>' + prc.ccode[ icd ]
			else
				prc.ccode[ icd ] += '<br>' + nest + code
	}
	clearC( prc, idx ){
		prc.ccode[ idx ] = undefined
	}
	addV( prc, icd, code, ahead ){
		let nest = ''.padStart( prc.nest*4, ' ' )
		if ( prc.vccode[ icd ] == undefined )
			prc.vccode[ icd ] = nest + code
		else
			if ( ahead )
				prc.vccode[ icd ] = nest + code + '<br>' + prc.vccode[ icd ]
			else
				prc.vccode[ icd ] += '<br>' + nest + code
	}
	findLab( prc, fld, val ){
		for ( let idx in prc.Labs ){ 
			let lab = prc.Labs[idx]
			if ( lab[fld] == val ) 
				return lab
		}
		return null
	}
	interpInstr( prc, icd ){
		let instr = this.code[ icd ]
		if ( instr==undefined ) debugger
		let a = this.AI.frInstr( instr )
		prc.ops[ icd ] = { idx: icd, inst: a }
		
		// if ( prc.fncall != null ){
			// if ( (a.op=='jmp' && a.idx==1) ){  // special case of jump over literals after function return
				// prc.fncall.idx = (icd + a.sdisp - 2)
			// } else {
				// if ( (icd == prc.fncall.idx+2) && (a.src==0 || a.reg==0)){  // use of R0 => function result?
					// Sym.Reg(0).val = prc.fncall.call
				// }
				// else
					// this.addC( prc, prc.fncall.idx, prc.fncall.call )
				// prc.fncall = null
			// }
		// }
	//	Sym.show( icd, a )
		let cval = 0, snm = ''
		if ( a.idx==1 || a.op=='jii' ){		// set 'cval' = self-rel code value, 'snm' to static name for that addr
			cval = this.code[ icd + a.sdisp ] // const or staticaddr
			snm = this.staticNm( cval )
		}
		for ( let idx in prc.Labs ){ 
			let lab = prc.Labs[idx]
			if ( lab.afterTest == icd || lab.lpEnd==icd || lab.afterSwitch == icd ){
				prc.nest--		// end of test or loop or switch
				prc.control.pop( )
			}
		}
	//	let descr = `${prc.nm}.${icd} N=${prc.nest}  ${a.asm} ` + prc.control.join(' ')
	//	console.log( descr )
		
		switch ( a.op ){
			case 'lda':
				if ( a.idx==1 ){
					if ( a.ind != 0 ){ // load static value
						Sym.SetReg( a.reg, Sym.SVar(cval) )
					} else {  // load code constant
						Sym.SetReg( a.reg, `${cval}`, 'int_t' )
					}
				}
				else if ( a.idx==2 ){  // load fr var
					if ( a.disp==3 ){  // temp3 == reg[4]
						Sym.SetReg( a.reg, Sym.Reg( 4 ))
					} else {
						Sym.SetReg( a.reg, Sym.AVar( a.disp ).nm )  // AVar because lda 1st => arg
					}
				}
				else if ( a.idx==3 ){	// vec reference
					Sym.SetReg( a.reg, `(((arr_t)${Sym.RegV(3)})[${a.sdisp}])`, 'arr_t' )
				}
				this.addTodo( icd+1 )
				break
				
			case 'sta': 		// store to variable
				let symreg = Sym.Reg( a.reg )
				let regval = symreg.getTrimmed()
				if ( a.idx==1 && a.ind==1 ){ //indirect => assign to static
					this.addC( prc, icd, `${Sym.SVar( cval )} = ${regval};` )
				} else if ( a.idx==2 ){	// store to frame
					let decl = ''
					if ( a.disp==3 ){  // sta into temp3 -- treat like 4th reg
						Sym.SetReg(4, symreg )
					} else {
						let dsym = Sym.FVar( a.disp, 'int_t' )
						if ( symreg.getVal().includes('+ fp')){
							symreg = symreg.asVec( prc )
							this.addC( prc, icd, `int_t ${dsym}${symreg.val};` )
						} else
						this.addC( prc, icd, `${dsym.asDecl()} = ${regval};` )
					}
				} else if ( a.idx==3 ){	// array index
					this.addC( prc, icd, `${Sym.RegV(3)}[${a.sdisp}] = ${regval};` )
				}
				Sym.clrReg( a.reg )
				this.addTodo( icd+1 )
				break
				
			case 'com':
			case 'neg':
			case 'mov':
			case 'inc':
			case 'adc':
			case 'sub':
			case 'add':
			case 'and':		
				this.interpALC( prc, icd )
				break
				
			case 'jii':		// call proc through static
				let nargs = this.code[icd+1]
				let call = Sym.SVar( cval ).asFnCall( nargs )
				Sym.SetReg(0, call ).procIdx = icd
				this.addC( prc, icd, call + ';' )  // procedure call that may have to be undone
				this.addTodo( icd+2 ) // skip nargs
				break
				
			case 'jsr':
				this.interpJsr( prc, icd )
				break
				
			case 'jmp':
				this.interpJmp( prc, icd )
				break
		}
	}
	dotRel( icd ){
		let val = this.code[ icd ]
		if ( (val & 0x8000)!=0 ) val = -( 0x10000 - val )
		return icd + val
	}
	interpBranch( prc, icd ){
		// find jump to Branch
		let jmpToHere = this.findLab( prc, 'targ', icd )
		let swtop = jmpToHere? jmpToHere.jmpFrom : 0
		let lastcase = this.code[icd+1]
		let ncases = this.code[icd+2]
console.log( `${prc.nm} Branch@${icd}: ncases=${ncases} lastcase:${lastcase}` )
		let tgtloc = icd+3
		for (let i=0; i<ncases; i++){
			let dst = this.dotRel( tgtloc+i )
			if ( dst < swtop ) swtop = dst
			this.addC( prc, dst, `case ${lastcase-i}:` )
console.log( `  ${prc.nm} Br_case ${lastcase-i} => tgt:${dst}` )
			this.addTodo( dst )
		}
		let endbranch = tgtloc+ncases
		prc.Labs[icd] = { typ:'Branch', ncases: ncases, swtop: swtop, start: icd, 
			end: endbranch, afterSwitch: endbranch+1  }
console.log( `${prc.nm} Sw${icd} top:${swtop} endSw:${endsw} after:${endsw+1}` )
		//this.addV( prc, swtop, `//switch( ${prc.reg[0]} ){  //Branch`, true ) //ahead of case labels
		this.addC( prc, swtop, `switch( ${Sym.Reg(0).getVal()} ){  //Branch`, true ) //ahead of case labels
		this.addTodo( tgtloc+ncases )
		this.addC( prc, tgtloc+ncases, 'default: ' )
		this.addC( prc, endbranch+1, `}  //sw${icd}` )
console.log( `  ${prc.nm} Br_def tgt:${tgtloc+ncases}` )
		prc.nest++	// will process switch cases next
		prc.control.push( `switch${icd}` )
	}
	interpLookup( prc, icd ){
		let jmpToHere = this.findLab( prc, 'targ', icd )
		let swtop = jmpToHere? jmpToHere.jmpFrom : 0
		//	case 'Lookup':
		let npairs = this.code[icd+1]
		console.log( `${prc.nm} Lkup@${icd}: npairs=${npairs}` )
		for (let i=0; i<npairs; i++ ){
			let valdst = icd+2 + i*2  // addr of [val,dest-.]
			let val = this.code[ valdst ]
			let dst = this.dotRel( valdst+1 )
			if ( dst < swtop ) swtop = dst
console.log( `  ${prc.nm} Lkup ${val} => tgt:${dst}` )
			this.addC( prc, dst, `case ${this.code[valdst]}: ` ) 
			this.addTodo( dst )
		}
		let endsw = icd+(npairs*2)+2
		//this.addV( prc, swtop, `//switch( ${prc.reg[0]} ){  //Lookup`, true )
		this.addC( prc, swtop, `switch( ${Sym.RegV(0)} ){  //Lookup`, true )
		this.addC( prc, endsw+1, `}  //sw${icd}` )
		prc.Labs[icd] = { typ:'Lookup', npairs: npairs, swtop: swtop, start: icd, 
					endSw: endsw, afterSwitch: endsw+1  }
console.log( `${prc.nm} Sw${icd} top:${swtop} end:${endsw} after:${endsw+1}` )
		this.addTodo( icd+(npairs*2)+2 )
console.log( `  ${prc.nm} Lkup def tgt:${icd+(npairs*2)+2}` )
		this.addC( prc, icd+(npairs*2)+2, 'default: ' )
		prc.nest++	// will process switch cases next
		prc.control.push( `switch${icd}` )
	//	break
	}
	interpRuntimeCall( prc, icd ){
		let a = prc.ops[ icd ].inst
		let sym = this.symByPage0[ a.disp ]
		let rshift = '', lshift = '', shift
		if ( sym == undefined ) debugger 
		
		let nm = this.symByPage0[ a.disp ].nm
		if ( nm.indexOf('.')>0 ){		// decode LQ0.0 .. LQ0.7, LQ1.x SQ0.x SQ1.x
			shift = parseInt( nm.substring(nm.length-1))
			rshift = ` >>${shift}`
			lshift = ` <<${shift}`
			nm = nm.substring(0,nm.length-2)
		}
				
		switch( nm ){
			case 'Branch':  this.interpBranch( prc, icd ); break
			case 'Lookup':  this.interpLookup( prc, icd ); break

			case 'DivRem':		// r1 <- r0/r1  r0 <- r0 rem r1
				let num = Sym.RegV(0), denom = Sym.RegV(1)
				Sym.SetReg( 1, `(${num} / ${denom})` )
				Sym.SetReg( 0, `(${num} % ${denom})` )
				this.addTodo( icd+1 )
				break
				
			case 'Mult':	// r0,r1 <- r0 * r1
				Sym.SetReg( 1, `((${Sym.RegV(0)} * ${Sym.RegV(1)}) & 0xffff)` )
				Sym.SetReg( 0, `((${Sym.RegV(0)} * ${Sym.RegV(1)}) >> 16)` )
				this.addTodo( icd+1 )
				break
			case 'MulPlus': // r0 <- r3 <- r1* code[1] + r0  
				let mul = this.code[ icd ]
				Sym.SetReg( 0, `((${Sym.RegV(1)} * ${mul}) + ${Sym.RegV(0)})` )
				this.addTodo( icd+2 )
				break
				
			case 'Eqv':		// r0 <- r0 eqv r1
				Sym.SetReg( 0, `(!(${Sym.RegV(0)} ^ ${Sym.RegV(1)}))` )
				this.addTodo( icd+1 )
				break
			case 'Xor':		// r0 <- r0 xor r1
				Sym.SetReg( 0, `(${Sym.RegV(0)} ^ ${Sym.RegV(1)})` )
				this.addTodo( icd+1 )
				break
			case 'Ior':		// r0 <- r0 | r1
				Sym.SetReg( 0, `(${Sym.RegV(0)} | ${Sym.RegV(1)})` )
				this.addTodo( icd+1 )
				break			
			
			case 'RShift':
				Sym.SetReg(0, `(${Sym.RegV(0)} >> ${Sym.RegV(1)})` )
				this.addTodo( icd+1 )
				break
			case 'LShift':
				Sym.SetReg(0, `(${Sym.RegV(0)} << ${Sym.RegV(1)})` )
				this.addTodo( icd+1 )
				break
			
			case 'LQ0': 		// rshift r0 by 'shift' 1..7 
				let symr0 = Sym.RegV(0)
				if (symr0.endsWith('>>1')){
					let r = symr0.substring(0, symr0.length-3)
					Sym.SetReg(0, `(${r} >> ${shift+1})` )
				} else
					Sym.SetReg(0, `(${symr0}${rshift})` )
					
				this.addTodo( icd+1 )
				break

			case 'LQ1':  		// rshift r1 by 'shift' 1..7 
				Sym.SetReg(1, `(${Sym.RegV(1)}${rshift})` )
				this.addTodo( icd+1 )
				break
				
			case 'SNQ0':	// m[r1] = (m[r1] & !msk) + (r0 & msk)
			case 'SNQ1':
			case 'SQ0': 	// lshift r0 0..7 then SNQ0
			case 'SQ1':		// lshift r1 0..7 then SNQ0
				let sptr = Sym.Reg(0), sval = Sym.RegV(1)
				if ( nm.endsWith('0') ){
					sptr = Sym.Reg(1)
					sval = Sym.RegV(0)
				}
				let f = this.cStruct( this.code[icd+1] )	// field def from mask	
				if ( nm.startsWith('SNQ') && f.rsh!=0 ){
					let kv = this.constVal( sval )
					if ( kv != null ){ 
						sval = `${kv >> f.rsh}`
					} else {
						sval = `${sval} >> ${f.rsh}`	//store unshifted value!
					}
				}
				this.addC( prc, icd, `(${f.struct.cast} ${sptr.getVal()})->${f.fldnm} = ${sval};`)
				Sym.SetReg(0, '')  // mark as used
				this.addTodo( icd+2 ) // skip mask word
				break
				
			case 'LY01':	// load byte:  r0 = ((str_t)r0)[r1]
			case 'LY10':	// load byte:  r1 = ((str_t)r1)[r0]
				if ( nm=='LY01' ){
					Sym.SetReg(0, `(((str_t)${Sym.Reg(0)})[${Sym.RegV(1)}])` )
				} else {
					Sym.SetReg(1, `(((str_t)${Sym.Reg(1)})[${Sym.RegV(0)}])` )
					Sym.SetReg(0, '')
				}
				this.addTodo( icd+1 )
				break
				
			case 'SY01':	// store byte: ((str_t)r0)[r1] = r[4] (temp3)
			case 'SY10':	// store byte: ((str_t)r1)[r0] = r[4] (temp3)
				if ( nm=='SY01' ){
					this.addC( prc, icd, `((str_t)${Sym.Reg(0)})[${Sym.Reg(1)}] = ${Sym.Reg(4)}` )
				} else {
					this.addC( prc, icd, `((str_t)${Sym.Reg(1)})[${Sym.Reg(0)}] = ${Sym.Reg(4)}` )
				}
				Sym.SetReg(0, '')
				this.addTodo( icd+1 )
				break
				
			case 'Return':
				let rval = Sym.RegV(0)
				if ( rval != '' ){
					this.addC( prc, icd, `return ${rval};` )
					prc.procSym.typ = Sym.Reg(0).typ
				} else
					this.addC( prc, icd, 'return;' )
				break
				
			default:
				this.addC( prc, icd, nm )
		}
	}
	interpJsr( prc, icd ){
		let a = prc.ops[ icd ].inst
		if ( a.idx==1 && a.sdisp > 0 ){  // str or table literal
			let tbl = this.code.slice( icd+1, icd + a.sdisp )
			let nch = (tbl[0] >> 8)
			let nwds = (nch>>1)+1
			if ( nwds== a.sdisp-1 ){
				prc.reg[3] = ` "${asBStr( tbl )}"`
				Sym.SetReg(3, ` "${asBStr( tbl )}"`, 'str_t' )
			} else {
				let tx = ''
				for ( let wd of tbl ) tx += ` ${CH(wd)},`
				prc.reg[3] = `table [ ${tx.substring(0,tx.length-1)} ]`
				Sym.SetReg(3, `table [ ${tx.substring(0,tx.length-1)} ]`, 'arr_t' )
			}
			this.addTodo( icd + a.sdisp ) 
			return
		} 
	
		if ( a.idx==0 ){	// calls to runtime routines
			this.interpRuntimeCall( prc, icd )
		} else {
			this.addC( `${prc.nm} ${icd} idx jsr` )
			this.addTodo( icd+1 )
		}
	}
	fieldDecl( fb, lb ){
		if ( fb > 15 ) return { decl: '' }
		let wid = lb+1 - fb
		if (wid < 1) return { decl: '' }
		let fldnm = `b${fb}_${lb}`
		return { fldnm: fldnm, rsh: 15-lb, decl: `  unsigned int ${fldnm}: ${wid}; <br>` }
	}
	cStruct( mask ){
		let fb=16, lb=0, bit = 0x8000
		for ( let i=0; i<16; i++ ){
			if ((mask & bit) != 0 ){ 
				if ( i < fb ) fb = i
				if ( i > lb ) lb = i
			}
			bit = bit >> 1
		}
		
		let fnm = `b${fb}_${lb}`
		let res = this.bitfields[ fnm ] 
		if ( res!= undefined ) return res
		
		let structnm = `BF${fb}_${lb}`
		let cast = `(${structnm} *)`
		let prefld  = this.fieldDecl( 0, fb-1 )
		let field   = this.fieldDecl( fb, lb )
		let postfld = this.fieldDecl( lb+1, 15 )
		let decl = `struct ${structnm}{<br>${prefld.decl}${field.decl}${postfld.decl}};<br>`
		decl += `typedef struct ${structnm} ${structnm}; <br>`
		
		let structdef = { structnm: structnm, decl: decl, cast: cast }
		this.bitfieldStructs[ structnm ] = structdef

		if ( prefld.decl != '' ) 
			this.bitfields[ prefld.fldnm ] = { fldnm: prefld.fldnm, rsh: prefld.rsh, struct: structdef }
		if ( postfld.decl != '' ) 
			this.bitfields[ postfld.fldnm ] = { fldnm: postfld.fldnm, rsh: postfld.rsh, struct: structdef }
		this.bitfields[ fnm ] = { fldnm: fnm, rsh: field.rsh, struct: structdef }
		
		return this.bitfields[ fnm ]
	}
	interpJmp( prc, icd ){
		let a = prc.ops[icd].inst
		
		if ( a.idx != 1 ) 
			this.addC( prc, icd, 'Unexpected non-self-relative jump' )
		
		/* self-relative jumps
		// 	 ALC skip saves: Labs[skip] = { typ:'skip' test: }
		// 
		// while:  jmpToLpTest body Test jmpToBody	
		//  A) jmpToBody at skip+1 is backwards  => { typ:'loop' lpTop:  lpTest: } 
		//
		// ifThen: test jmpAfterTest thenBody afterTest
		//  B) jmp at skip+1 is fwd => sets ifElse & afterTest
		//
		// ifThenElse: test jmpToElse thenBody jmpAfterElse elseBody afterElse afterTest
		//  C) if jmp at ifElse-1:  set afterTest to target
		//
		//  D) other jumps: Labs[jmpFrom] = { targ: jmpFrom: }
		//    eg. jmp to Branch or Lookup
		*/
		let targ = icd + a.sdisp
		this.addTodo( targ )
		
		if ( prc.Labs[ icd-1 ] ){   // jmp follows skip
			if ( prc.Labs[icd-1].typ!='skip' ) console.log( `${prc.nm}.${icd} jump w/o skip` )
			if ( a.sdisp < 0 ){ 
			// A) jump back => targ==loopBody 
				let jttst = prc.Labs[ targ-1 ]   // entry for jump to test
				if (jttst==undefined) 
					console.log( `${prc.nm}.${icd} back jump w/o test` ) // debugger
				else {
					prc.Labs[ icd-1 ] = {  typ: 'loop', lpTop: targ, lpTest: jttst.targ, lpEnd:icd+1 }
					this.addV( prc, targ, `// while ${prc.test}{  // Lp${targ}` )
					this.addC( prc, targ, `while ${prc.symtest}{  // Lp${targ}` )
					this.addC( prc, icd+1, `} // Lp${targ}` )
					prc.nest++	// will process loop body next
					prc.control.push( `while${icd}` )
				}
				console.log( `${prc.nm} A) jmp back after skip at ${icd-1}, jmp over body at ${targ-1}` )
			} else {  
			// B) jmp fwd after skip-- ifThen jmp to afterTest (or maybe afterThen)
				prc.Labs[ icd-1 ] = { typ: 'ifThen', skip: icd-1, afterTest: targ }
				prc.control.push( `ifThen${icd-1}` )	
				this.addV( prc, icd-1, `// if ${prc.test}{  // If${icd-1}` )
				this.addC( prc, icd-1, `if ${prc.symtest}{  // If${icd-1}` )
				this.addC( prc, targ, `} // If${icd-1}` )
				prc.nest++
	console.log( `${prc.nm} B) jmp fwd after skip  ifThen${icd-1} to ${targ}` )
			}
		} else {  
			for ( let idx in prc.Labs ){  
				let lab = prc.Labs[idx]
				if ( lab.afterTest == icd+1 ){ // this is jmp over elseBody
			// C -- search for entry with afterTest = icd+1
					prc.ccode[icd+1] = undefined
					prc.control.pop()	// ifThen
					prc.control.push( `ifElse${lab.skip}` )
					lab.afterThen = icd+1		// afterTest was actually afterThen
					lab.afterTest = targ		// targ is new afterTest
	console.log( `${prc.nm} C) ifThen  skip:${lab.skip} afterThen:${lab.afterThen} afterTest:${lab.afterTest}` )
					prc.nest--   // for test syntax
					this.addC( prc, icd, `} else {  // If${lab.skip}` )
					this.addC( prc, targ, `} // If${lab.skip}` )
					prc.nest++  // for else body
					return
				}	
			}
	console.log( `${prc.nm} D) jmp ${icd}->${targ}` )
			// fwd jump, not afterTest or afterThen--  could be over loop body, or to branch or lookup
			let lab = this.findLab( prc, 'afterSwitch', targ )
			if ( lab ) // is this a jump to the end of a switch?
				this.addC( prc, icd, 'break;' )
			lab = this.findLab( prc, 'endSw', icd )
			if ( lab ){ // or a jump back to the default case of a switch?
				prc.nest--
				prc.ccode[lab.endSw] = ''
				this.addC( prc, targ, 'default:' )
				prc.nest++
			}
			prc.Labs[icd] = { targ: targ, jmpFrom: icd }	
		}
	}
	interpALC( prc, icd ){
		let a = prc.ops[icd].inst
		Sym.clearReg( a.dst )	// mark that R0 will be overwritten-- not a function result
		let sv = Sym.RegV( a.src )
		let dv = Sym.RegV( a.dst )
		let asm = a.asm.substring( 0, a.asm.indexOf(' '))
		let asmskip = asm + a.skipif
		let shcry = (a.shft!=0 || a.cry!=0)
		let suffix = ''
		if (a.shft==2 && a.cry==1){  // rz  >>1 after op
		  suffix = '>>1'
		  shcry = false
		}
		let symres = `( ${sv} ${asm} ${dv} )`
		let symtest = ''
		if (shcry){
			switch ( asmskip ){
				case 'sublz':  		symres = 1;						break
				case 'movlz':  		symres = `(${sv} * 2)`; 		break
				case 'adcl#szc':  	symtest = `( ${sv} > ${dv} )`;  break
				case 'negl#snc':  	symtest = `( ${sv} > 0 )`;		break
				case 'subl#szc':  	symtest = `( ${dv} >= ${sv} )`;	break
				case 'adcl#snc':  	symtest = `( ${sv} <= ${dv} )`;	break
				case 'ands': 
					if (sv == '65280'){ 
						symres = `( (${dv} & 0xff00)>>8 )`;
					}
					break
				default:		  
					symtest = `( ${a.asm} : ${sv} ? ${dv} )`
					break
			}
		} 
		else {
			switch( a.op ){
				case 'com':	symres = `( ~${sv} )`; 		break
				case 'neg':	symres = `( -${sv})`; 		break
				case 'mov':	symres = sv; 				break
				case 'inc': symres = `(${sv} + 1)`; 	break
				case 'adc': symres = `(${dv} + ~${sv})`; break
				case 'sub':	symres = a.src==a.dst? '0' : `(${dv} - ${sv})`; break
				case 'add': symres = `(${dv} + ${sv})`; break
				case 'and': symres = `(${this.asHexConst(dv)} & ${this.asHexConst(sv)})`;	break
				default: debugger
			}
		}
		symres += suffix
		if ( a.nld == 0 ){ // dst is modified
			Sym.SetReg( a.dst, symres, Sym.Reg( a.src ).typ )	// typ from src only-- works for mov
		}

		this.addTodo( icd+1 )
		if ( a.skip != 0 ){ // loop test, or if?
			prc.Labs[ icd ] = { typ: 'skip', test: icd }
		let t = prc.Labs[icd]
		console.log( `skip@${icd}` )
			this.addTodo( icd+2 )	// might skip
			//prc.test = test	
			prc.symtest = symtest	// save C test expression: could be loop or ifThen
		}
	}
	constVal( v ){	// if v is numeric string -> value, else null
		if ( v instanceof Sym )
			v = v.getVal()
		if ( typeof v != 'string' ) debugger
		if ( v.match( /^[0-9]+$/ )) 
			return parseInt(v)
		return null
	}
	asHexConst( v ){	// if v is numeric string => v as hex
	  let val = this.constVal( v )
	  //if ( v.match( /^[0-9]+$/ )) return `0x${H( parseInt(v))}`
	  return val==null? v : `0x${H(val)}`
	}
	showProc( prc, verbose ){
		let html = this.genProc( prc, verbose )
		HUI.popup( '<pre>' + html + '</pre>' )
	}	
	genProc( prc, verbose ){
		let html = ''
		for ( let i= prc.entryIdx; i<=prc.iEnd; i++ ){
			let o = prc.ops[i]
			if ( o ){
				let lab = ' '
				if (typeof o.idx != 'number') debugger
				if ( prc.Labs[ o.idx ] ) lab = 'L'
				let ccd = prc.ccode[ o.idx ]
				if (ccd==undefined) ccd = ''
				let vcd = prc.vccode[ o.idx ]
				if (vcd==undefined) vcd = ''
				
				if ( verbose ){ 
					html += vcd + '<br>'
					html += `${ccd.padEnd(35,' ')}  // ${lab}${o.idx} ${H(this.fileCodeStart+o.idx)}: ${H(this.code[o.idx])}  ${o.inst.asm}<br>`
				} else if ( ccd != '' )
					html += `${ccd} <br>`
			}
		}
		return html
	}
	asCFile( fnm, verbose ){
		let txt = `// ${fnm} generated by AltoDecode <br>`

		txt += '<br>typedef long long int_t; <br>'
		txt += 'typedef long * arr_t; <br>'
		txt += 'typedef char * str_t; <br>'

		for ( let ln of this.staticdecls )
			txt += ln

		txt += '<br>'
		for ( let nm in this.bitfieldStructs )
			txt += this.bitfieldStructs[nm].decl
		for ( let prc of this.procs )
			txt += this.genProc( prc, verbose )
		txt = txt.replace( /<br>/g, '\n' )
		return txt
	}
}












