(function(tracker, $, undefined) {
  tracker.app = tracker.app || {};

  tracker.app.Main = function(options) {
    this.DEBUG = true;
    this.SHOW_ALERTS = true;
    this.SUPPORTED_GPX_VERSIONS = ['1.1'];
    this.GET_FILE_URL = "http://mysite.com/file/"; // + fileId

    if(this.hasSupportForFileAPI()){
      this.supportFileAPI = true;
    } else {
      this.supportFileAPI = false;
      alert('The File APIs are not fully supported in this browser.');
    }
  };

  tracker.app.Main.prototype.run = function(){
    var that = this;

    // Read local file
    $('.parse-local-files').unbind('click');
    $('.parse-local-files').bind('click', function() {
      that.readLocalFiles('files', 'file-info');
    });

    // Read remote file
    $('.parse-remote-file').unbind('click');
    $('.parse-remote-file').bind('click', function() {
      that.readRemoteFile($('#file-url').val(), 'file-info');
    });
  };

  // ------ File Sources ------

  tracker.app.Main.prototype.readLocalFiles = function(inputId, fileInfoId) {
    var that = this;
    var files = $('#' + (inputId || ''))[0].files;
    
    if (files.length === 0) {
      if(this.SHOW_ALERTS) { alert('Please select a file!'); }
      if(this.DEBUG) { console.log('File not selected!'); }
      return;
    }

    var file = files[0]; // TODO More files selected
    var reader = new FileReader();
    var fileInfo = {
      fileName: file.name,
      fileSize: file.size,
      fileSizeKB: '' + (file.size / 1024.0).toFixed(3) + ' KB',
      lastModifiedDate: file.lastModifiedDate
    };

    // If we use onloadend, we need to check the readyState.
    reader.onloadend = function(evt) {
      if (evt.target.readyState == FileReader.DONE) { // DONE == 2
        $('#' + (fileInfoId || '')).html('<pre>'+ that.syntaxHighlight(fileInfo) +'</pre>');

        var startParsing = new Date().getTime();
        that.__gpxXmlToJson(evt.target.result, file.size);
        var parsingTime = ((new Date().getTime() - startParsing) / 1000.0).toFixed(3);

        if(that.DEBUG){ console.log('GpxXmlToJson | Execution time: ' + parsingTime + 'sec'); }
      }
    };

    reader.readAsBinaryString(file.slice(0, file.size));
  };

  tracker.app.Main.prototype.readRemoteFile = function(fileUrl, fileInfoId) {
    var that = this;

    var fileInfo = {
      remoteFile: fileUrl
    };

    var startParsing = new Date().getTime();
    $.get(fileUrl).
      done(function(xmlData) {
        xmlData = xmlData || [];

        fileInfo.fileSize = xmlData.length;
        fileInfo.fileSizeKB = '' + (fileInfo.fileSize / 1024.0).toFixed(3) + ' KB';
        fileInfo.status = 'Success';
        $('#' + (fileInfoId || '')).html('<pre>'+ that.syntaxHighlight(fileInfo) +'</pre>');
        
        that.__gpxXmlToJson(xmlData, xmlData.length);
        var parsingTime = ((new Date().getTime() - startParsing) / 1000.0).toFixed(3);

        if(that.DEBUG){ console.log('GpxXmlToJson | Execution time: ' + parsingTime + 'sec'); }
      }).
      fail(function() {
        that.__gpxXmlToJson('', 0);
        var parsingTime = ((new Date().getTime() - startParsing) / 1000.0).toFixed(3);

        if(that.DEBUG) {
          console.log('Data Loading Error:');
          console.log("  Network resource '"+ fileUrl +"' can not be loaded!");
          console.log('GpxXmlToJson | Execution time: ' + parsingTime + 'sec');
        }

        fileInfo.status = 'Fail';
        $('#' + (fileInfoId || '')).html('<pre>'+ that.syntaxHighlight(fileInfo) +'</pre>');

        if(that.SHOW_ALERTS) { alert("'" + fileUrl + "' can not be loaded!"); }
      });

    console.log(fileUrl);
  };

  // ------ File Sources ------


  // ------ GPX Parser ------

  tracker.app.Main.prototype.__gpxFileInfo = function(jqXML) {
    var gpxTag = jqXML.find('gpx').first();
    var metadataTag = jqXML.find('metadata').first();
    var authorTag = metadataTag.find('author').first();
    var copyrightTag = metadataTag.find('copyright').first();
    var boundsTag = metadataTag.find('bounds').first();

    var fileId = this.guid();
    var gpxVersion = gpxTag.attr('version') || '0';

    if(this.SUPPORTED_GPX_VERSIONS.indexOf(gpxVersion) === -1) {
      throw 'Unsuported GPX Version';
    }

    var copyright = (copyrightTag.attr('author') || '') + 
      ' | ' + (copyrightTag.find('year').first().text() || '') +
      ' | ' + (copyrightTag.find('license').first().text() || '');
    copyright = copyright === ' |  | ' ? '' : copyright;

    return {
      fileId: fileId,
      gpxVersion: gpxTag.attr('version') || '0',
      creator: gpxTag.attr('creator') || '',
      name: metadataTag.find('name').first().text() || '',
      desc: metadataTag.find('desc').first().text() || '',
      author: authorTag.find('name').text() || '',
      email: authorTag.find('email').text() || '',
      copyright: copyright,
      time: metadataTag.find('time').first().text() || '',
      timeFormat: 'ISO8601',
      keywords: metadataTag.find('keywords').first().text() || '',
      link: this.GET_FILE_URL + fileId,
      bounds: {
        minLat: boundsTag.attr('minlat') || -1, minLng: boundsTag.attr('minlon') || -1,
        maxLat: boundsTag.attr('maxlat') || -1, maxLng: boundsTag.attr('maxlon') || -1
      }
    }
  };

  tracker.app.Main.prototype.__gpxWaypoints = function(jqXML) {
    var waypoints = [];
    var convert = this.convertCoord;
    
    jqXML.find('wpt').each(function(){
      var wptTag = $(this);
      
      waypoints.push({
        type: wptTag.find('type').first().text() || '',
        name: wptTag.find('name').first().text() || '',
        desc: wptTag.find('desc').first().text() || '',
        cmt: wptTag.find('cmt').first().text() || '',
        icon: wptTag.find('link').first().attr('href') || '',
        coords: {
          lat: convert(wptTag.attr('lat')),
          lng: convert(wptTag.attr('lon')),
          ele: convert(wptTag.find('ele').first().text(), 2),
          time: wptTag.find('time').first().text() || '',
          timeFormat: 'ISO8601'
        }
      });

    });

    return waypoints;
  };

  tracker.app.Main.prototype.__gpxTracks = function(jqXML) {
    var that = this;
    var convert = this.convertCoord;
    var tracks = [];

    jqXML.find('trk').each(function(){
      var trkTag = $(this);
      var segments = [];

      trkTag.find('trkseg').each(function(){
        var segmentTag = $(this);
        var trkPoints = [];

        segmentTag.find('trkpt').each(function(){
          var pointTag = $(this);
          
          trkPoints.push({
            lat: convert(pointTag.attr('lat')),
            lng: convert(pointTag.attr('lon')),
            ele: convert(pointTag.find('ele').first().text(), 2),
            time: pointTag.find('time').first().text() || ''
          });
        });
        
        segments.push(trkPoints);
      });

      tracks.push({
        trackId: that.guid(),
        name: trkTag.find('name').first().text() || '',
        desc: trkTag.find('desc').first().text() || '',
        cmt: trkTag.find('cmt').first().text() || '',
        type: trkTag.find('type').first().text() || '',
        segments: segments
      });
    });

    return tracks;
  };

  tracker.app.Main.prototype.__gpxLogger = function(json, fileSizeInBytes) {
    if($('#debug-gpx-logger').length === 0) {
      $('body').append('<div id="debug-gpx-logger"></div>');
    }

    json = this.__gpxJsonMinify(json); // TODO

    //var tracksAsJson = JSON.stringify(json, undefined, 2);
    var tracksAsJson = JSON.stringify(json);

    if ((fileSizeInBytes || 0) > (6 * 1024 * 1024)) { // if larger then 6 mb
      $('#debug-gpx-logger').html('<pre>' + tracksAsJson + '</pre>');
    } else {
      $('#debug-gpx-logger').html('<pre>' + this.syntaxHighlight(tracksAsJson) + '</pre>');
    }

    // $('#debug-gpx-logger').html('<pre>' + tracksAsJson + '</pre>');

    console.log(json);
  };

  tracker.app.Main.prototype.__gpxXmlToJson = function(gpx, fileSizeInBytes) {
    if(!gpx || gpx.length === 0 || fileSizeInBytes === 0) {
      if(this.DEBUG) { this.__gpxLogger({}); }
      return {}
    }

    try {
      var jqXmlDoc = $($.parseXML(gpx));
      var gpxToJson = {
        fileInfo: this.__gpxFileInfo(jqXmlDoc),
        waypoints: this.__gpxWaypoints(jqXmlDoc),
        tracks: this.__gpxTracks(jqXmlDoc)
      };

      if(this.DEBUG) { this.__gpxLogger(gpxToJson, fileSizeInBytes); }

      return gpxToJson;
    } catch(error) {
      if(this.DEBUG) { this.__gpxLogger({}); }

      if(typeof error === 'string'){
        console.log('ParserError:');
        console.log('  ' + error);
        if(this.SHOW_ALERTS) { alert('ParserError: ' + error); }
      } else {
        if(this.SHOW_ALERTS) { alert('Invalid file structure'); }
      }
      
      return {};
    }
  };

  // ------ GPX Parser ------

  // ------ GpxJson Minifier ------

  tracker.app.Main.prototype.__gpxJsonMinify = function(gpxJsonObj) {

    // Waypoints
    var fields = ['type', 'name', 'desc', 'cmt', 'icon', 'coords', ['lat', 'lng', 'ele', 'time', 'timeFormat']];
    
    var minifiedWaypoints = [
      fields
    ];

    $(gpxJsonObj.waypoints).each(function() {
      var waypoint = this;
      var minWaypoint = [];

      $(fields).each(function(index) {
        var field = this;
        
        if(field.constructor === String) {
          minWaypoint.push(waypoint[field]);
        } else if (field.constructor === Array) {
          var subField = minWaypoint[index-1];
          var minSubField = [];
          
          $(field).each(function() {
            minSubField.push(subField[this]);
          });
          
          minWaypoint[index-1] = minSubField;
        }
      });

      minifiedWaypoints.push(minWaypoint);
    });
    gpxJsonObj.waypoints = minifiedWaypoints;

    // Track segments
    // TODO
    var fields = ['lat', 'lng', 'ele', 'time'];
    
    $(gpxJsonObj.tracks).each(function() {
      var track = this;

      $(track.segments).each(function(index){
        var segment = this;
        var minifiedSegment = [fields];

        $(segment).each(function() {
          var point = this;
          var minifiedPoint = [];
          
          $(fields).each(function() {
            minifiedPoint.push(point[this]);
          });

          minifiedSegment.push(minifiedPoint);
        });

        track.segments[index] = minifiedSegment;
      });
    });

    return gpxJsonObj;
  };

  // ------ GpxJson Minifier ------

  // ------ Utils ------

  tracker.app.Main.prototype._supportFeature = function(apiFeature) {
    // yes/no mark
    return apiFeature ? '\u2714' : '\u2717'
  };

  tracker.app.Main.prototype.hasSupportForFileAPI = function() {
    if(this.DEBUG){
      console.log('---------------- debug ----------------');
      console.log('Supported features:');
      console.log('  html5.File ' + this._supportFeature(window.File));
      console.log('  html5.FileReader ' + this._supportFeature(window.FileReader));
      console.log('  html5.FileList ' + this._supportFeature(window.FileList));
      console.log('  html5.Blob ' + this._supportFeature(window.Blob));
      console.log('---------------- debug ----------------');
    }

    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      // Great success! All the File APIs are supported.
      return true;
    } else {
      return false;
    }
  };

  tracker.app.Main.prototype.guid = function() {
    var timeit = new Date().getTime();
    
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    guid = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();

    timeit += new Date().getTime();

    return guid + '-' + timeit
  };

  tracker.app.Main.prototype.syntaxHighlight = function(json) {
    if (typeof json != 'string') {
      json = JSON.stringify(json, undefined, 2);
    }

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
      function (match) {
        var cls = 'number';
        
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
          } else {
            cls = 'string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
  };

  tracker.app.Main.prototype.convertCoord = function(aCoord, precision) {
    if(!aCoord){
      return -1;
    }

    precision = precision || 7;

    try {
      return parseFloat(aCoord).toFixed(precision);
    } catch (error) {
      return -1;
    }
  };

  // ------ Utils ------

}(window.jsTracker = window.jsTracker || {}, jQuery));

jQuery(function(){
  var application = new jsTracker.app.Main({
  });

  application.run();
});
