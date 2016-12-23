import Parsers from './parsers/Parsers';

export default class MovaViz {
    title: string;
    tracks: any[];
    _debug: boolean;
    _debugErr: boolean;
    _frameSkip: number;
    _dataReady: boolean;
    _fnQueue: any[];

    /**
     * The constructor
     * 
     * @param  {string} title
     */
    constructor(title: string) {
        if (!(this instanceof MovaViz)) return new MovaViz(title);
        this.title = title;
        this.tracks = [];      
        this._debug = true;
        this._debugErr = true;
        this._frameSkip = 1;  
        this._dataReady = false;
        this._fnQueue = [];
    }
    
    /**
     * Load the data into the object
     * 
     * @param  {string} url
     * @param  {string} format the format of the data, currently only supports 'bvh'
     * @param  {any} callbackFn an optional function to be called once the data is loaded
     */
    data(url: string, format: string, callbackFn: any) {
        let self = this;
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

         // The Parsers[format] will call the proper function         
         let parser: any = new Parsers[format]();
         parser.load(url, function(data: any) {
             track.data = data;
             self.log("Done!");
             self._dataReady = true;
             
             while (self._fnQueue.length > 0) {                 
                 let fn = self._fnQueue.pop();                 
                 fn[0](fn[1]);
             }             

             if (callbackFn)
                callbackFn();
         });

         this.tracks.push(track);

        return this;
    }

    /**
     * Set the frame skip
     * 
     * @param  {number} skip
     */
    frameSkip(skip: number) {
        this._frameSkip = skip;

        return this;
    }

    
    /**
     * Set the SVG container
     * 
     * @param  {string} cont
     */
    container(cont: string) {

        return this;
    }

    jointsDraw(drawFn: any) {
        let self = this;        

        if (!self._dataReady) {
            self._fnQueue.push([this.jointsDraw.bind(this), drawFn]);
            return self;
        }
            
        console.log(self.tracks[self.tracks.length-1].data.frameArray.filter(function(d: number,i:number){
            return i % self._frameSkip == 0;
        }));

        return this;
    }

    debug(d: boolean) {
        this._debug = d;

        return this;
    }

    debugErrors(d: boolean) {
        this._debugErr = d;

        return this;
    }

    log(m: string) {
        if (this._debug)
            console.log(this.title + ": " + m.toString());
    }

    err(m: String) {
        if (this._debugErr)
            console.log("ERROR - "+ this.title + ": " + m.toString());
    }
}