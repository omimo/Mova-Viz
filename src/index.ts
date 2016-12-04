import Parsers from './parsers/Parsers';

export default class MovaViz {
    title: string;
    tracks: any[];
    debug: true;
    debugErr: true;

    constructor(title: string) {
        if (!(this instanceof MovaViz)) return new MovaViz(title);
        this.title = title;
        this.tracks = [];        
    }

    data(url: string, format: string, callbackFn: any) {
    // Create the Track object
         let track = {
             url: url,
             data: 0,
             format: format,
             isMocap: false             
         };
        
         
         if (format in {'bvh':1,'c3d':1}) 
            track.isMocap = true;

         this.log("Loading the track ...");
         // The Parsers.trackReaders will call the proper function
         let p:any = new Parsers[format];
         let parser: any = new Parsers[format]();
         parser.load(url, function(data: any) {
             track.data = data;
             this.log("Done!");
             if (callbackFn)
                callbackFn();
         });

         this.tracks.push(track);

        return this;
    }

    log(m: string) {
    if (this.debug)
        console.log(this.title + ": " + m.toString());
    }

    err(m: String) {
        if (this.debugErr)
            console.log("ERROR - "+ this.title + ": " + m.toString());
    }
}