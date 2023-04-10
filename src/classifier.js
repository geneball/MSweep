	import { asBStr, asTxt, asChrs, padSpc, O, H, I  } 		from './fmt.js'
	import { msg } from './msg.js'
	import { App } from './app.js'	// App.Refresh() on category enabled changes
	
	
export class DataClassifier {		// data object categorizer => display classes
	constructor( nm, dataArray, gui, defaultfmt ){
		this.nm = nm
		this.data = dataArray
		if ( gui instanceof DataClassifier ){  // defining sub-classifier
			this.parent = gui
			this.gui = this.parent.gui.addGroup( nm, nm, defaultfmt )
			this.gui.addBreak()
			this.defaultfmt = this.parent.defaultFmt
			this.CatDef = this.parent.CatDef
			this.FmtDef = this.parent.FmtDef
		} else {
			this.gui = gui
			this.defaultFmt = defaultfmt==undefined? 'e05' : defaultfmt
			this.CatDef = []
			this.FmtDef = { }
		}
		this.fields = {}	// info about sub-fields
		this.offset = 0		// offset within data
	}
	defData( nm, rng, fmt, hide ){		// define range as data subregion
		let fd = this.defFld( nm, rng, fmt, !hide )
		fd.classifier = new DataClassifier( this.nm + '.' + nm, this.data.slice( rng[0], rng[1] ), this)
		fd.classifier.offset = rng[0]
		fd.classifier.gui.setHidden( hide==undefined? false : hide )
		return fd.classifier
	}
	defFld( nm, rng, fmt, enab ){	// define range as field classified with format
		if ( rng instanceof Array ){
			if ( rng.length == 1 ) rng.push( rng[0] )
			if ( rng.length != 2 ) debugger	
		} else {
			rng = [ rng, rng ]
		}
		rng = [ rng[0]+this.offset, rng[1]+this.offset ]
		
		this.addRngCat( nm, rng, fmt )
		this.enabCat( nm, enab==undefined? false : enab )
		
		let fd = { nm: nm, rng: rng }
		this.fields[ nm ] = fd 
		return fd
	}
	fld( nm ){
		let fd = this.fields[nm]
		if ( fd==undefined ) debugger
		return fd
	}
	val( nm ){
		let fd = this.fld(nm)
		let rlen = fd.rng[1]+1 - fd.rng[0]
		if ( rlen==1 ) // return value of single word
			return this.data[ fd.rng[0]-this.offset ]
		else  // or slice for a range
			return this.data.slice( fd.rng[0]-this.offset, fd.rng[1]-this.offset )
	}
	addRngCat( nm, rng, fmts ){
		if ( fmts == undefined ) fmts = this.defaultFmt
		this.FmtDef[ nm ] = ( typeof fmts == 'string'? [ fmts ] : fmts )
		
		this.CatDef.push( { nm: nm, typ:'RNG', enab:false, rng: rng, fmts: fmts } )
		this.gui.addCategory( nm, fmts, ()=>{ this.enabCat( nm ); App.Refresh() }, true )
		this.enabCat( nm, false )
	}
	enabCat( nm, val ){
		for ( let r of this.CatDef ){
			if ( r.nm == nm ){
				r.enab = val==undefined? !r.enab : val
				this.gui.setVal( nm, r.enab )
				if ( r.typ=='RNG' )
				msg( this.showCat( r ))
			}
		}
	}
	showCat( def ){
		switch ( def.typ ){
			case 'RNG': 	
				return `${def.nm}: ${H(def.rng[0])}..${H(def.rng[1])} `
			   
			case 'MATCH':
				return `${def.nm} val & ${H(def.patt[0])} == ${H(def.patt[1])}`
				
			default:  
				return `${def.nm} ${def.typ}`
		}
	}
	addMatchCat( nm, patt, fmts ){
		if ( fmts == undefined ) fmts = this.defaultFmt
		this.FmtDef[ nm ] = ( typeof fmts == 'string'? [ fmts ] : fmts )

		this.CatDef.push( { nm:nm, typ:'MATCH', enab:true, patt: patt, fmts: fmts } )
		this.gui.addCategory( nm, fmts, ()=>{ this.enabCat( nm ); App.Refresh() }, true )
		this.enabCat( nm, false )
	}

	evalCls( addr, val ){	// classify addr:val and return formatting classes
		let cats = []
		for (let c of this.CatDef ){
			if ( c.enab && c.typ=='RNG' && (addr >= c.rng[0]) && (addr <= c.rng[1]) )
				cats.push( c.nm )
			if ( c.enab && c.typ=='MATCH' && ((val & c.patt[0])==c.patt[1]) )
				cats.push( c.nm )
		}
		let b = 'b19', t = 't09', e = 'e19'		// default bkg, txt, edges
		for ( let cat of cats ){
			let fmt = this.FmtDef[ cat ]
			if (fmt != undefined)
				for ( let f of fmt ){
					if ( f.charAt(0)=='b' ) b = f
					if ( f.charAt(0)=='t' ) t = f
					if ( f.charAt(0)=='e' ) e = f
				}
		}
		return `${b} ${t} ${e}`
	}
	spn( fmt, addr, val ){  // => classified <span> of 'val' at 'addr'
		let cls = this.evalCls( addr, val )
		switch (fmt){
			case 'O': return `<span class="${cls}">${O(val)}</span>` 
			case 'H': return `<span class="${cls}">${H(val)}</span>` 
			case 'I': return `<span class="${cls}">${asInst(val)}</span>` 
		}
	}
	asData( addr, data, SW ){	// => 'data' formatted & classified 
		let hx = '', oct = '', txt = '', code = ''
		if ( SW.hex ) hx += H(addr) + ':'
		if ( SW.oct ) oct += O(addr) + ':'
		for ( let i=0; i<data.length; i++ ){
			let wd = data[i]
			if ( SW.hex ) hx 		+= this.spn( 'H', addr+i, wd )
			if ( SW.oct ) oct 		+= this.spn( 'O', addr+i, wd )
			if ( SW.code ) code 	+= this.spn( 'I', addr+i, wd )
		}
		if ( SW.chrs ) txt = ' ' + asChrs( data )
		if ( SW.txt ) return asTxt( data )
		return hx + oct + code + txt + '<br>'
	}
	showData( data, fmtSW, maxChWidth ){ // display classified data[] according to fmtSW booleans
	//  pad: , hex: , oct: , chrs: , txt: , code:  }
		let wdchrs = (fmtSW.hex? 5 : 0) + (fmtSW.oct? 7 : 0)
		wdchrs += (fmtSW.chrs? 1 : 0) + (fmtSW.code? 4 : 0) 
		// wdchrs = #chars / word for 'fmtSW' settings
		let mx = (maxChWidth-20)/ wdchrs		// leave space for addresses
		let step = 64
		while (step > mx) step /= 2
		msg( `${wdchrs} ch/wd & ${maxChWidth} ch/line => ${step} wds/line` )
		
		let html = '<pre>'
		for ( let i=0; i<data.length; i+=step ){
			html += this.asData( i, data.slice( i, i+step ), fmtSW ) 
		}
		return html +  '</pre>'
	}	
}

// var AltoI
// export function asInst( wd ){
	// if ( AltoI == undefined ) AltoI = new AltoInstr()
	// let a = AltoI.frInstr( wd )
	// let s = AltoI.toStr( a )
	// return s
// }
