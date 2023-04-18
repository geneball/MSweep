	import { asBStr, asTxt, asChrs, padSpc, O, H, CH, I  } 		from './fmt.js'
	import { msg } from './msg.js'
	import { HUI } from './htmlui.js'
	import { App } from './app.js'
	import { saveAs } from 'file-saver'

	
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











