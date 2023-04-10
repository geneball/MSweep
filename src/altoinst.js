	import { asBStr, asTxt, asChrs, padSpc, O, H, CH, I  } 		from './fmt.js'
	import { msg } from './msg.js'
	import { HUI } from './htmlui.js'
	
	
export class AltoSyms {
	constructor( nm, classifier ){
		this.classifier = classifier
		this.verbose = true
		this.asSyms( classifier )
	}
	tglVerbose( ){
		let vb = [  ]
		for (let nm of vb)
			this.classifier.gui.showVal(nm)
	}
	asSyms( cls ){
/*
/----------------------------------------------------------------------------
structure SYmsHeader:	// header of .SYMS file
//----------------------------------------------------------------------------
[
version word		// version of BLDR that loaded
fileLength word		// in words
namesAddr word		// file word location of name strings
symsAddr word		// location of static symbol descriptions
brFilesAddr word	// location of .BR file descriptions
binFilesAddr word	// location of .RUN and .BB file descrips
blank^6b,17b word	// reserved
]*/
		cls.defFld( 'version',		0 )		
		cls.defFld( 'fileLength',	1 )
		cls.defFld( 'namesAddr',	2 )
		cls.defFld( 'symsAddr',		3 )
		cls.defFld( 'brFilesAddr',	4 )
		cls.defFld( 'binFilesAddr',	5 )
		
		let nmsOff = cls.val( 'namesAddr' )
		let symsOff = cls.val( 'symsAddr' )
		let brFilesOff = cls.val( 'brFilesAddr' )
		let binFilesOff = cls.val( 'binFilesAddr' )
		let fileLen = cls.val( 'fileLength' )
		
		cls.defFld( 'nms', [nmsOff, symsOff-1], 'b11', true )
		cls.defFld( 'syms', [symsOff, brFilesOff-1], 'b12', true )
		cls.defFld( 'brFiles', [brFilesOff, binFilesOff-1], 'b13', true )
		cls.defFld( 'binFiles', [ binFilesOff, fileLen-1 ], 'b14', true )
		
		let wdCnt = cls.data[nmsOff]
		let nms = this.nms = {}	// keyed by word pos
		let npos = nmsOff+1
		let iNm = 0
		while ( npos < nmsOff+wdCnt ){ 
			let d = cls.data[ npos ], ds = H(d)
			let wlen = (cls.data[ npos ] >> 8) + 1   //incl cnt byte
			wlen = (wlen & 1)? (wlen+1)/2 : wlen/2
			this.nms[npos] = asBStr( cls.data.slice( npos, npos+wlen ))
			//cls.defFld( this.nms[npos], [ npos, npos+wlen-1 ], 'b15' )
			npos += wlen
			iNm++
		}	
		let symTyps = {	
			0x0c01: 'S', 
			0x0801: 'S',
			0x1801: 'S', 
			0x0804: 'S', 
			0x0815: 'S', 
			
			0x1001: 'P', 
			0x1007: 'P', 
			0x100f: 'P', 
			0x1010: 'P', 
			0x1012: 'P', 
			0x1015: 'P', 
			0x1018: 'P', 
			0x101c: 'P', 
			0x1020: 'P', 
			0x1401: 'P', 
			0x181f: 'P', 
			0x0802: 'V',	//link to var
			0x0803: 'V',	//link to var
			0x0c02: 'V',	//link to var
			0x1002: 'L', 	//link to proc
			0x1003: 'L', 	//link to proc
			0x1005: 'L', 	//link to proc
			0x100c: 'L', 	//link to proc
			0x1402: 'L' 	//link to proc
		}
		let nSyms = cls.data[ symsOff ]
		let entLen = 4, ent = symsOff+1
		for (let iSym=0; iSym < nSyms; iSym++ ){
			let nm = nms[ nmsOff+cls.data[ent] ]
			let typ = symTyps[ cls.data[ent+1] ]
			if (typ==undefined) typ = 'U'
			let loc = H(cls.data[ent+2])
			let val = H( cls.data[ent+3] )
			let typNm = 
			cls.defFld( `${typ}${loc}:${nm}=${val}`, [ent, ent+entLen-1 ], 'b16' )
			ent += entLen
		}

		let nBrs = cls.data[ brFilesOff ]
		entLen = 4, ent = brFilesOff+1
		for (let iBr=0; iBr < nBrs; iBr++ ){
			let nm = nms[ nmsOff+cls.data[ent] ]
			cls.defFld( `BR${iBr}:${nm}`, [ent, ent+entLen-1 ], 'b17' )
			ent += entLen
		}

		let nBins = cls.data[ binFilesOff ]
		entLen = 4, ent = binFilesOff+1
		for (let iBin=0; iBin < nBins; iBin++ ){
			let nm = nms[ nmsOff+cls.data[ent] ]
			cls.defFld( `BI${iBin}:${nm}`, [ent, ent+entLen-1 ], 'b18' )
			ent += entLen
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
		let byAddr = {}, byLink = {}
		/*
		"bcplRT":	{	"LQ0":    { "indirect": "0",   "addr": "300" },
		"bcplCONST":{	"Zero":		{ "addr": "352", "value": 0 },
		"bcplVAR":	{	"StackLimit":	{ "addr": "335" }
		"osLink":	{	"Ws": 			{ "idx": 4,		"addr": "0146325" },
		*/
		for ( let g of ['BcplRT', 'bcplCONST', 'bcplVAR', 'osVar', 'osLink', 'progVAR', 'proc' ] ){
			let sect = this.syms[ g ]
			if ( sect ){
				for ( let s of Object.getOwnPropertyNames( sect )){
					let sym = sect[s]
					if ( typeof sym.addr=='string' )
						sym.addr = parseInt( sym.addr, 8 )
					if ( typeof sym.value=='string' ) 
						sym.value = parseInt( sym.value, 8 )
					byAddr[sym.addr] = s
					if ( typeof sym.idx == 'string' )	// osLink entry
						byLink[ parseInt(sym.idx,8) ] = { nm: s, addr: sym.addr }
				}
			}
		}
		this.symByAddr = byAddr
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
		let scls = cls.defData( 'statics', [ stOff, stOff + nStatics-1  ], 'b12', false ) 
		this.statics = cls.val('statics')	// array of static locations
		this.staticNms = {}
		
		cls.gui.addBreak()
		let ccls = cls.defData( 'code', [ cdOff, cdOff + nCode ], 'b10', false ) 		
		this.code = cls.val( 'code' )	// code array within run file

		cls.gui.addBreak()
		cls.defFld( 'staticLinks',  [ lnkOff, lnkOff + nStaticLinks ], 'b14' )
		
		let staticAddrs = cls.val('staticLinks') // array of static addresses to link
		let staticLinks = []
		for ( let i=0; i<nStaticLinks; i++ ) // build list of statics that are links
			staticLinks.push( staticAddrs[i]- this.startOfStatics )
		
		this.procs = []
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
			} else if ( this.isCodeAddr( this.statics[i] )){ 
				nm = `P${i}`
				this.procs.push( { nm: nm, staticIdx: i, entryIdx: this.codeIdx( this.statics[i] ) } )
				//this.defineProc( i, scls, ccls )   // statics[i] is a pointer into code
			}
			this.staticNms[sA] = { idx: i, addr: sA, nm: nm }
		}
		for (let prc of this.procs )
			this.defineProc( prc, prc.staticIdx, scls, ccls )
		this.tglVerbose()
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
		if ( e!=undefined ) e.nm = `V${this.staticIdx(sA)}`
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
		prc.control = [ prc.nm ]
		prc.nest = 0
		let iEntry = prc.entryIdx
		prc.iEnd = iEntry
		
		scls.defFld( prc.nm, iStatic, 'b18' )
		let frm = this.code[ iEntry+2 ]
		ccls.defFld( `${prc.nm} fr${frm}`, [ iEntry, iEntry+3 ], 'b18', false )
		ccls.gui.addButton('cd', ()=>{ this.showProc( prc,  this.verbose )} )
		
		this.addC( prc, iEntry, `function ${prc.nm}( f1,f2,f3,f4 ){` )
		prc.nest++
		prc.ops[iEntry] = { idx: iEntry, framesiz: frm, inst: { asm: '' }}
		let todo = [ iEntry+4 ]
		prc.visited = []
		prc.reg = [ 'nargs', '', 'fp', '' ]
		let cnt = 0
		while ( todo.length > 0 && cnt<40 ){
			cnt++
			todo.sort((a,b)=>a-b)
			let iCd = todo.shift()	// get lowest unvisited instruction
			if ( !prc.visited.includes( iCd )){
				prc.visited.push( iCd )
				if (iCd > prc.iEnd) prc.iEnd = iCd
				this.interpInstr( prc, iCd, todo )
			}
		}
		prc.nest--
		this.addC( prc, prc.iEnd, '}' )
	}
	showProc( prc, verbose ){
		let html = `<pre> Proc ${prc.nm} <br>`
		for ( let i= prc.entryIdx; i<=prc.iEnd; i++ ){
			let o = prc.ops[i]
			if ( o ){
				if (typeof o.idx != 'number') debugger
				if ( prc.Labs[ o.idx ] && verbose )
					html += `L${o.idx} <br>`
				let ccd = prc.ccode[ o.idx ]
				if ( verbose ) 
					html += `${o.idx} ${H(this.fileCodeStart+o.idx)}: ${H(this.code[o.idx])}  ${o.inst.asm} <br>`
				if ( ccd != undefined )
					html += `${ccd} <br>`
			}
		}
		HUI.popup( html + '</pre>' )
	}
	addC( prc, icd, code ){
		let nest = '                  '.substring( 0, prc.nest*4 )
		console.log( `addC: ${code}` )
		if ( prc.ccode[ icd ] == undefined )
			prc.ccode[ icd ] = nest + code
		else
			prc.ccode[ icd ] += '<br>' + nest + code
	}
	interpInstr( prc, icd, todo ){
		let instr = this.code[ icd ]
		if ( instr==undefined ) debugger
		let a = this.AI.frInstr( instr )
		prc.ops[ icd ] = { idx: icd, inst: a }
		let cval = 0, vnm = '', snm = ''
		if ( a.idx==1 || a.op=='jii' ){
			cval = this.code[ icd + a.sdisp ] // const or staticaddr
			snm = this.staticNm( cval )
		}			
		if ( a.idx==2 ) 
			vnm = a.disp>=4? `f${a.disp-3}` : `tmp${a.disp}`
		for ( let idx in prc.Labs ){ 
			let lab = prc.Labs[idx]
			if ( lab.afterTest == icd || lab.lpEnd==icd ){
				prc.nest--		// end of test or loop
				prc.control.pop( )
			}
		}
		let descr = `${prc.nm}.${icd} N=${prc.nest}  ${a.asm} ` + prc.control.join(' ')
		console.log( descr )
		
		switch ( a.op ){
			case 'lda':
				if ( a.idx==1 ){
					if ( a.ind != 0 ){ // load static value
						prc.reg[ a.reg ] = this.staticVarNm( cval )
					} else  // load code constant
						prc.reg[ a.reg ] = `${cval}`
				}
				if ( a.idx==2 )  // load fr var
					prc.reg[ a.reg ] = vnm
				if ( a.idx==3 )
					prc.reg[ a.reg ] = `( ${prc.reg[3]}[${a.sdisp}] )`
				todo.push( icd+1 )
				break
				
			case 'sta': 		// store to variable
				let reg = prc.reg[ a.reg ].toString().trim()
				if ( reg.charAt(0)=='(' ) reg = reg.substring( 1, reg.length-1 )
				if ( a.idx==1 && a.ind==1 )
					this.addC( prc, icd, `${this.staticVarNm(cval)} = ${reg}` )
				if ( a.idx==2 )
					this.addC( prc, icd, `${vnm} = ${reg}` )
				if ( a.idx==3 )
					this.addC( prc, icd, `${prc.reg[3]}[${a.sdisp}] = ${reg}` )
				todo.push( icd+1 )
				break
				
			case 'com':
			case 'neg':
			case 'mov':
			case 'inc':
			case 'adc':
			case 'sub':
			case 'add':
			case 'and':		
				this.interpALC( prc, icd, todo )
				break
				
			case 'jii':		// call proc through static
				let nargs = this.code[icd+1]
				let call =  `${snm}(` 
				if (nargs > 0) call += ` ${prc.reg[0]},`
				if (nargs > 1) call += ` ${prc.reg[1]},`
				for (let i=2; i<nargs; i++)
					call += ` a${i},`
				this.addC( prc, icd, call.substring(0,call.length-1) + ' )' )
				todo.push( icd+2 ) // skip nargs
				break
				
			case 'jsr':
				if ( a.idx==1 && a.sdisp > 0 ){  // str or table literal
					let tbl = this.code.slice( icd+1, icd + a.sdisp )
					let nch = (tbl[0] >> 8)
					let nwds = (nch>>1)+1
					if ( nwds== a.sdisp-1 )
						prc.reg[3] = ` "${asBStr( tbl )}"`
					else {
						let tx = ''
						for ( let wd of tbl ) tx += ` ${CH(wd)},`
						prc.reg[3] = `table [ ${tx.substring(0,tx.length-1)} ]`
					}
					todo.push( icd + a.sdisp )
				} else {	// calls to runtime routines
					if ( instr == 0x0cf6 ){
						this.addC( prc, icd, `return` )
					} else 
						todo.push( icd+1 )	//unless return
				}
				break
				
			case 'jmp':
				this.interpJmp( prc, icd, todo )
				break
		}
	}
	interpJmp( prc, icd, todo ){
		let a = prc.ops[icd].inst
		
		if ( a.idx != 1 ) 
			this.addC( prc, icd, 'Unexpected non-self-relative jump' )
		
		/* self-relative jumps
		// all jumps =>  Labs[targ] = { Targ: JmpFrom: }
		// while:  jmpToLpTest body Test jmpToBody	
		//  A) jmpToBody is backwards  => { typ:'loop' lpTop  lpTest } 
		//
		// ifThen: test jmpAfterTest thenBody afterTest
		// 	 skip => Labs[test] = { test: ifThen:+1 ifElse: afterTest: }
		//
		//  B) if jmp at +1 => sets ifElse & afterTest
		// ifThenElse: test jmpToElse thenBody jmpAfterElse elseBody afterElse afterTest
		//  C) if jmp at ifElse-1:  set afterTest to target
		*/
		let targ = icd + a.sdisp
		todo.push( targ )
		prc.Labs[targ] = { targ: targ, jmpFrom: icd }	
		
		if ( a.sdisp < 0 ){ // A) jump back => targ==loopBody -- find jmp to test
			for ( let idx in prc.Labs ){ 
				let lab = prc.Labs[idx]
				if ( lab.jmpFrom+1 == targ ){ // top of loop
					prc.Labs[targ] = {  typ: 'loop', lpTop: targ, lpTest: lab.targ, lpEnd:icd+1, targ: targ, jmpFrom: icd }
					this.addC( prc, targ, `while ${prc.test}{  // Lp${targ}` )
					this.addC( prc, icd, `}  // Lp${targ}` )
					break
				}
			}
			prc.nest++
			prc.control.push( `while${icd}` )
		} else if ( prc.Labs[ icd-1 ] != undefined ){	// was previous instr a skip?
			// B) jmp to afterTest (or maybe afterElse)
			prc.control.push( `ifThen${icd-1}` )
			let tst = prc.Labs[ icd-1 ]
			this.addC( prc, icd-1, `if ${prc.test}{  // If${icd-1}` )
			this.addC( prc, targ, `} // If${icd-1}` )
			prc.nest++
			tst.afterTest = targ	// targ might be afterTest
		} else {  
			for ( let idx in prc.Labs ){  // C -- search for entry with afterTest = icd+1
				let lab = prc.Labs[idx]
				if ( lab.afterTest == icd+1 ){ // this is jmp over elseBody
					prc.ccode[icd+1] = undefined
					prc.control.pop()	// ifThen
					prc.control.push( `ifElse${lab.test}` )
					lab.afterElse = icd+1		// afterTest was actually afterElse
					lab.afterTest = targ		// targ is new afterTest
					prc.nest--   // for test syntax
					this.addC( prc, icd, `} else {  // If${lab.test}` )
					this.addC( prc, targ, `} // If${lab.test}` )
					prc.nest++  // for else body
					return
				}	
			}
			// fwd jump, not afterTest or afterElse--  must be over loop body
		}
	}
	interpALC( prc, icd, todo ){
		let a = prc.ops[icd].inst
		let sval = prc.reg[ a.src ]
		let dval = prc.reg[ a.dst ]
		let asm = a.asm.substring( 0, a.asm.indexOf(' '))
		let asmskip = asm + a.skipif
		let shcry = (a.shft!=0 || a.cry!=0)
		let res = `( ${sval} ${asm} ${dval} )`
		let test = ''
		if (shcry){
			switch ( asmskip ){
				case 'sublz':  res = 1; 								break
				case 'movlz':  res = `(${sval} * 2)`; 					break
				case 'adcl#szc':  test = `( ${sval} > ${dval} )`; 				break
				case 'negl#snc':  test = `( ${sval} > 0 )`; 					break
				case 'subl#szc':  test = `( ${dval} >= ${sval} )`; 				break
				case 'adcl#snc':  test = `( ${sval} <= ${dval} )`; 				break
				default:		  test = `( ${a.asm} : ${sval} ? ${dval} )`; 	break
			}
		} 
		else {
			switch( a.op ){
				case 'com':	res = `( ~${sval} )`; break
				case 'neg':	res = `( -${sval})`; break
				case 'mov':	res = sval; 	break
				case 'inc': res = `(${sval} + 1)`; break
				case 'adc': res = `(${dval} + ~${sval})`; break
				case 'sub': res = a.src==a.dst? '0' : `(${dval} - ${sval})`; break
				case 'add': res = `(${dval} + ${sval})`; break
				case 'and': res = `(${dval} & ${sval})`; break
				default: debugger
			}
		}
		if ( a.nld == 0 ) // dst is modified
			prc.reg[ a.dst ] = res

		todo.push( icd+1 )
		if ( a.skip != 0 ){
			prc.Labs[ icd ] = { typ: 'ifThen', test: icd, ifThen: icd+2, afterTest: null }
			todo.push( icd+2 )	// might skip
			prc.test = test		// could be loop or ifThen
		}
	}

}

export class AltoInstr {
	constructor(){
		this.AI = {}
		let memFs   = [ 'ind', 'idx', 'disp' ]
		let LdStaFs = [ 'reg', 'ind', 'idx', 'disp' ]
		let AlcFs   = [ 'shft', 'cry', 'nld', 'src', 'dst', 'skip' ]
		let AltoF   = [ 'disp' ]
		this.opDef = { 
			jmp:      { op: 0x0000, Fs: memFs },
			jsr:      { op: 0x0800, Fs: memFs },
			isz:      { op: 0x1000, Fs: memFs },
			dsz:      { op: 0x1800, Fs: memFs },
			lda:      { op: 0x2000, Fs: LdStaFs }, 
			sta:      { op: 0x4000, Fs: LdStaFs }, 
			com:      { op: 0x8000, Fs: AlcFs },
			neg:      { op: 0x8100, Fs: AlcFs }, 
			mov:      { op: 0x8200, Fs: AlcFs },
			inc:      { op: 0x8300, Fs: AlcFs },
			adc:      { op: 0x8400, Fs: AlcFs },
			sub:      { op: 0x8500, Fs: AlcFs },
			add:      { op: 0x8600, Fs: AlcFs },
			and:      { op: 0x8700, Fs: AlcFs },
			cyc: 	  { op: 0x6000, Fs: AltoF },
			trp:	  { op: 0x6100, Fs: AltoF },
			t63:	  { op: 0x6300, Fs: AltoF },
			t64:	  { op: 0x6400, Fs: AltoF },
			t65:	  { op: 0x6500, Fs: AltoF },
			t66:	  { op: 0x6600, Fs: AltoF },
			t67:	  { op: 0x6700, Fs: AltoF },
			t68:	  { op: 0x6800, Fs: AltoF },
			jii: 	  { op: 0x6900, Fs: AltoF },
			jis: 	  { op: 0x6a00, Fs: AltoF },
			t6b:	  { op: 0x6b00, Fs: AltoF },
			t6c:	  { op: 0x6c00, Fs: AltoF },
			t6d:	  { op: 0x6d00, Fs: AltoF },
			cnv: 	  { op: 0x6e00, Fs: AltoF },
			t6f:	  { op: 0x6f00, Fs: AltoF },
			t70:     { op: 0x7000, Fs: AltoF },
			t71:     { op: 0x7100, Fs: AltoF },
			t72:     { op: 0x7200, Fs: AltoF },
			t73:     { op: 0x7300, Fs: AltoF },
			t74:     { op: 0x7400, Fs: AltoF },
			t75:     { op: 0x7500, Fs: AltoF },
			t76:     { op: 0x7600, Fs: AltoF },
			t77:     { op: 0x7700, Fs: AltoF },
			t78:     { op: 0x7800, Fs: AltoF },
			t79:     { op: 0x7900, Fs: AltoF },
			t7a:     { op: 0x7a00, Fs: AltoF },
			t7b:     { op: 0x7b00, Fs: AltoF },
			t7c:     { op: 0x7c00, Fs: AltoF },
			t7d:     { op: 0x7d00, Fs: AltoF },
			t7e:     { op: 0x7e00, Fs: AltoF },
			t7f:     { op: 0x7f00, Fs: AltoF },
			mul:     { op: 0x6210, Fs: [] }, 
			div:     { op: 0x6211, Fs: [] }, 
			rck:     { op: 0x6203, Fs: [] },  
			sio:     { op: 0x6204, Fs: [] },  
			blt:     { op: 0x6205, Fs: [] },  
			bls:     { op: 0x6206, Fs: [] }, 
			sit:     { op: 0x6207, Fs: [] },  
			jrm:     { op: 0x6208, Fs: [] },  
			rrm:     { op: 0x6209, Fs: [] },   
			wrm:     { op: 0x620a, Fs: [] },  
			vsn:     { op: 0x620c, Fs: [] },  
			drd:     { op: 0x620d, Fs: [] },  
			dwr:     { op: 0x620e, Fs: [] },  
			dex:     { op: 0x620f, Fs: [] },  
			dg1:	 { op: 0x6212, Fs: [] },  
			dg2:     { op: 0x6213, Fs: [] }, 
			bbt:     { op: 0x6214, Fs: [] },  
			xld:     { op: 0x6215, Fs: [] },  
			xst:     { op: 0x6216, Fs: [] },
		}
		this.opDefByOp = []
		for ( let defnm of Object.getOwnPropertyNames(this.opDef) ){
			let def = this.opDef[ defnm ]
			this.opDefByOp[ def.op ] = { nm: defnm, Fs: def.Fs }
		}
		this.msk = { 
			disp: 0x00ff, idx: 0x0300, ind: 0x0400, reg: 0x1800, 
			src: 0x6000, dst: 0x1800, shft: 0x00c0, cry: 0x0030, nld: 0x0008, skip: 0x0007
		}
		this.shift = { 
			disp: 0,  idx: 8, ind: 10, reg: 11, src: 13, dst: 11,
			shft: 6, cry: 4, nld: 3, skip: 0
		}
		this.fieldVals = { 
		  'ind': [ '', ' @' ],
		  'idx': [ '', '.', 'x2', 'x3' ],
		  'reg': [ ' r0 ', ' r1 ', ' r2 ', ' r3 ' ],
		  'src': [ ' r0', ' r1', ' r2', ' r3' ],
		  'dst': [ ' r0', ' r1', ' r2', ' r3' ],
		  'shft': [ '', 'l', 'r', 's' ],
		  'cry': [ '', 'z', 'o', 'c' ],
		  'nld': [ '', '#' ],
		  'skip': [ '', ' skp', ' szc', ' snc', ' szr', ' snr', ' sez', ' sbn' ]
		}
		// 736b  &M 0000  &M 6000  &M 7300  &M 7300 
		this.decodeTree =  
			{ msk: 0x8000, cls:'top?',
			  opts: [
				{ vals: [0x8000], cls:'ALC',
					opmsk: 0x8700 //com,neg,mov,inc,adc,sub,add,and
				}, 
				{ vals: [0x0000], cls:'!ALC?',
					msk: 0xe000, 
					opts: [
						{ vals: [ 0x2000, 0x4000 ], cls:'lda/sta',
							opmsk: 0xe000 }, //lda,sta
						{ vals: [ 0x0000 ],  cls:'jmp?',
							msk: 0xf800,
							opts: [ 
								{ vals: [ 0x0000, 0x0800, 0x1000, 0x1800 ], cls:'jmp*',
								  opmsk: 0xf800  //jmp,jsr,isz,dsz
								},
							]
						},						
						{ vals: [ 0x6000 ],  cls:'alto?',
						    msk: 0xff00,
							opts: [
								{ vals: [ 0x6200 ], cls:'mul*',
								  opmsk: 0xffff 
								}, //mul,div,...
								{ vals: [ 0x6000, 0x6900, 0x6a00, 0x6e00, 
										  0x6100, 0x6300, 0x6400, 0x6500, 
										  0x6600, 0x6700, 0x6800, 0x6b00, 
										  0x6c00, 0x6d00, 0x6f00  ], cls:'cyc*',
 								  opmsk: 0xff00 //cycle,jsrii,jsris,convert,trap
								},
								{ vals: [ 0x7000, 0x7100, 0x7200, 0x7300, 
										  0x7400, 0x7500, 0x7600, 0x7700,
										  0x7800, 0x7900, 0x7a00, 0x7b00,
										  0x7c00, 0x7d00, 0x7e00, 0x7f00  ], cls:'trap7',
								  opmsk: 0xf000 //trap7
								}
							]
						}
					]
				}
			  ]
			}
		this.codePatts = [
			{ // entry: sta 3 2,1; jsr 370, fr, jsr 367
			  seq: [ 
				{ cd: 0x5a01, mk: 0xffff, nm: 'Sv ret addr' },
				{ cd: 0x0cf8, mk: 0xffff, nm: 'GetFrame' },
				{ cd: 0x0000, mk: 0x0000, nm: 'frame_size',
					FrameSz: { m:0xffff, sh:0 } 
				},
				{ cd: 0x0cf7, mk: 0xffff, nm: 'SvArgs' } 
			  ]
			},
			{ // r3 = strL 
			  cd: 0x0900, mk: 0xff00, nm: 'r3 = strL',
			  L: { m: 0xff, sh:0 }
			},
			{ // rX = argY
			  cd: 0x2204, mk: 0xe700, nm: 'rX = argY', 
			  X: { m: 0x1800, sh:11 },
			  Y: { m: 0x00ff, sh: 0 }
			}
		]
	}
	toInstr( a ){
		let def = this.opDef[ a.op ]
		let instr = def.op
		for ( let f of def.Fs ){
			if ( a[f] == undefined ) debugger
			instr += a[f] << this.shift[f]
		}
		return instr
	}
	toStr( a ){
		if (a.op==undefined)
			return 'trX'
		return  a.op + '   '.substring(a.op.length) 
	}
	frInstr( instr ){
		let op = 0
		let res = {}
		let dm = this.decodeTree
		let dbg = ` ${H(instr)} `
		for(let i=0;i<4;i++){
			let v = instr & dm.msk
			dbg += ` ${dm.cls} ${H(v)} `
			for ( let o of dm.opts ){
				if ( o.vals.includes( v )){
					if ( o.opmsk != undefined ){
						op = instr & o.opmsk
						let opDef = this.opDefByOp[ op ]
						if (opDef==undefined) opDef = this.opDef.trp
						res.op = opDef.nm
						res.asm = res.op
						dbg += ` ${res.op} `
						for ( let f of opDef.Fs ){
							let fv = (instr & this.msk[f]) >> this.shift[f]
							res[ f ] = fv
							if ( f=='disp' ){
								if ( res.idx==0 ){ //pg0
									res.sdisp = fv
									res.asm += ` ${fv}`
								} else {
									res.sdisp = fv & 0x80? -(256-fv) : fv
									res.asm += (fv & 0x80)? `-${256-fv}` : `+${fv}`
								}
							} else
								res.asm += this.fieldVals[f][ res[f] ]
						}
						if ( res.skip!=undefined )
							res.skipif = this.fieldVals.skip[ res.skip ].trim()
						return res
					} else {
						dm = o
						break
					}
				}
			}
		}
		console.log(dbg)
		debugger
	}
}













