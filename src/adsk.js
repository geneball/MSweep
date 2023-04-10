// ADsk.js -- Alto .dsk file decoder

import { asBStr, asTxt, asChrs, padSpc, O, H, I  } 		from './fmt.js'

export class ADsk {
	static PGSIZ = 267  // 1+2+8+256

	constructor ( file, ondone ){		// read & decode 'file' then call ondone( this )
		file.arrayBuffer().then( ( res ) => {
			let bdata = new Uint8Array( res ), blen = bdata.length
			this.data = []
			let xbyt = (( blen & 1 )!= 0)
			for (let i=0; i<blen/2; i++){
				let b1 = bdata[i*2] & 0xff, b2 = bdata[i*2+1] & 0xff
				this.data.push( (b2<<8) + b1 )
			}
			if ( xbyt )
				this.data.push( (bdata[ blen-1 ] & 0xff) << 8 )
			this.dskWords = this.data.length
			this.nPages = this.dskWords / ADsk.PGSIZ
			
			this.pg = []
			this.filesByFID = {}
			this.filesByNm = {}
			for ( let i=0; i < this.nPages; i++ ){
				let pgwds = this.data.slice( i*ADsk.PGSIZ, ((i+1)*ADsk.PGSIZ) )
				let nwds = (pgwds[6] & 1) != 0? (pgwds[6]+1)/2 : pgwds[6]/2
				let pg = this.pg[i] = {
					VDA:		i,
					pagenum: 	pgwds[ 0 ],
					hdr: 		[ pgwds[ 1 ], pgwds[ 2 ] ],
					nextRDA: 	pgwds[ 3 ],
					prevRDA: 	pgwds[ 4 ],
					nbytes:		pgwds[ 6 ],
					filepage:	pgwds[ 7 ],
					fid:		`${H( pgwds[ 8 ] )}-${H( pgwds[ 9 ] )}-${H( pgwds[ 10 ] )}`,
					isFreePg:	( pgwds[8] == 0xffff ),
					isFilePg:	( pgwds[8] == 0x0001 ),
					isDirPg:	( pgwds[9] == 0x8000 ),
					data:		pgwds.slice( 11, 11+nwds )
				}
				if ( pg.isFilePg ){
					let file = this.filesByFID[ pg.fid ]
					if ( file == undefined ){
						file = { fid: pg.fid,   pgs: [], npages: 0 }
						this.filesByFID[ pg.fid ] = file
					}
					file.pgs[ pg.filepage ] = pg.VDA
					if ( pg.filepage >= file.npages ) file.npages = pg.filepage+1
					if ( pg.filepage==0 ){
						file.fname = asBStr( pg.data.slice( 6, 26 ))
						this.filesByNm[ file.fname ] = file
					}
				}
			}
			if (typeof ondone == 'function')
				ondone( this )
		})
	}
	showPages( fid, pgnum ){	// => html list of pages matching 'fid' or 'pgnum'
		let html = ''
		for (let i=0; i<this.nPages; i++ ){
			let pg = this.pg[i]
			let file = this.filesByFID[ pg.fid ]
			let nm = '*'
			if (file != undefined) nm = file.fname
			if ( pg.fid.endsWith( H(fid)) || (fid==0 && pg.filepage==0) || (pg.filepage==pgnum) )
			  html += `vda:${H(i)} ${pg.fid} ${pg.filepage} ${pg.nbytes} ${nm}<br>`
		}
		return html
	}
	RDAtoVDA( rda ){		// convert read disk address to VDA
		let sector = ((rda >> 12) & 0xf)
		let head = ((rda >> 2) & 1)
		let cylinder = ((rda >> 3) & 0x1ff)
		let vda = (cylinder * 24) + (head * 12) + sector
		if ( rda & 2 ) vda += NPAGES
		return vda
	}
	asAltoTime( tm ){		// nyi
		let time = (( tm[0] & 0xffff ) << 16 ) + ( tm[ 1 ] & 0xffff )
		time += 2117503696;		/* magic value to convert to Unix epoch */
		//  ltm = localtime (&time);
		  /* like  4-Jun-80  17:14:36  */
		//  printf ("%02d-%s-%02d  %2d:%02d:%02d", ltm->tm_mday, monthnames[ltm->tm_mon],
		//	  ltm->tm_year, ltm->tm_hour, ltm->tm_min, ltm->tm_sec);
	}
	diskPage( vda ){		// => disk page object
		return this.pg[ vda ]
	}
	checkFile( fnm ){		// => string description
		let f = this.filesByNm[ fnm ]
		if ( f == undefined ) 
			return `Filename: ${fnm} not found`
		let errs = '', prev = 0
		for ( let i=0; i < f.npages; i++ ){
			let vda = f.pgs[ i ]
			if ( vda == undefined || vda<0 || vda>this.nPages ){
				errs += `pg${i}: bad vda ${vda} <br>`
			} else {
				let pg = this.pg[ vda ]
			
				if ( pg.fid != f.fid ){
					errs += `pg${i}: ${pg.fid} != ${f.fid} <br>`
				}
				if ( this.RDAtoVDA( pg.prevRDA ) !=  prev )
					errs += `pg${i} prevRDA=${H(pg.prevRDA)} != ${H(prev)} <br>`
				let nxt = this.RDAtoVDA( pg.nextRDA )
				let npg = (i==f.npages-1)? 0 : f.pgs[ i+1 ]
				if ( nxt != npg )
					errs += `pg${i} nextRDA=${H(pg.nextRDA)}=>${H(nxt)} != ${H(npg)} <br>`
				if ( pg.filepage != i ){
					errs += `pg${i} but filepage=${f.filepage} <br>`
				}
				prev = vda
			}
		}
		if ( errs=='' ) errs = `${fnm}: Legal file with ${f.npages}`
		return errs
	}
	fileNames(){			// => [] of file names
		// let nms = []
		// for (let k of Object.keys( this.filesByNm )){
			// let fi = this.filesByNm[k]
			// nms.push( `${k} ${fi.npages}` )
		// }
		
		return Object.keys( this.filesByNm )
	}
	fileInfo( nm ){			// => fileInfo object
		return this.filesByNm[ nm ]
	}
	fileData( nm ){			// => [] of all file data
		let f = this.filesByNm[ nm ]
		if ( f == undefined ) return undefined
		
		if ( f.data == undefined ){
			f.data = []
			for ( let i=1; i<f.npages; i++ ){
				f.data = f.data.concat( this.pg[ f.pgs[i] ].data )
			}
		}
		return f.data
	}
}