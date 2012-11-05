/**
 * Copyright (C) 2005-2010 Alfresco Software Limited.
 *
 * This file is part of Alfresco
 *
 * Alfresco is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Alfresco is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Alfresco. If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Dashboard Collaborations component.
 *
 * @namespace Cggh.dashlet
 * @class Cggh.dashlet.Collaborations
 */
   if (typeof Cggh == "undefined" || !Cggh)
   {
     var Cggh = {};
     Cggh.dashlet = {};
   }

(function()
{
   /**
    * YUI Library aliases
    */
   var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event,
      Selector = YAHOO.util.Selector,
      $msg = Alfresco.util.message;

   /**
    * Alfresco Slingshot aliases
    */
   var $html = Alfresco.util.encodeHTML,
      $links = Alfresco.util.activateLinks;

   /**
    * Use the getDomId function to get some unique names for global event handling
    */
   var FAV_EVENTCLASS = Alfresco.util.generateDomId(null, "fav-collaboration"),
      IMAP_EVENTCLASS = Alfresco.util.generateDomId(null, "imap-collaboration");

   /**
    * Preferences
    */
   var PREFERENCES_COLLABORATIONS = "org.cggh.share.collaborations",
      PREFERENCES_COLLABORATIONS_DASHLET_FILTER = PREFERENCES_COLLABORATIONS + ".dashlet.filter";

   var FAVOURITE_COLLABORATIONS = PREFERENCES_COLLABORATIONS + ".favourites";
   var IMAP_FAVOURITE_COLLABORATIONS = PREFERENCES_COLLABORATIONS + ".imapFavourites";
  
   /**
    * Dashboard Collaborations constructor.
    *
    * @param {String} htmlId The HTML id of the parent element
    * @return {Cggh.dashlet.Collaborations} The new component instance
    * @constructor
    */
   Cggh.dashlet.Collaborations = function Collaborations_constructor(htmlId)
   {
      Cggh.dashlet.Collaborations.superclass.constructor.call(this, "Cggh.dashlet.Collaborations", htmlId, ["datasource", "datatable", "animation"]);

      /**
       * Register this component
       */
      Alfresco.util.ComponentManager.register(this);
      /**
       * Load YUI Components
       */
      Alfresco.util.YUILoaderHelper.require(["button", "container",
        "datasource", "datatable", "paginator", "json", "history",
        "tabview"], this.onComponentsLoaded, this);

      // Initialise prototype properties
      this.collaborations = [];

      // Services
      this.services.preferences = new Alfresco.service.Preferences();

      return this;
   };

   YAHOO.extend(Cggh.dashlet.Collaborations, Alfresco.component.Base,
   {
      /**
       * Collaboration data
       *
       * @property collaborations
       * @type array
       */
      collaborations: null,

      /**
       * Object container for initialization options
       *
       * @property options
       * @type object
       */
      options:
      {
         /**
          * List of valid filters
          *
          * @property validFilters
          * @type object
          */
         validFilters:
         {
            "all": true,
            "favs": true
         },
          
         /**
          * Flag if IMAP server is enabled
          *
          * @property imapEnabled
          * @type boolean
          * @default false
          */
         imapEnabled: false,
         
         /**
          * Result list size maximum
          *
          * @property listSize
          * @type integer
          * @default 100
          */
         listSize: 100
      },

      /**
       * Fired by YUI when parent element is available for scripting
       * @method onReady
       */
      onReady: function Collaborations_onReady()
      {
         var me = this;

         // Create Dropdown filter
         this.widgets.type = Alfresco.util.createYUIButton(this, "type", this.onTypeFilterChanged,
         {
            type: "menu",
            menu: "type-menu",
            lazyloadmenu: false
         });

         this.widgets.status = Alfresco.util.createYUIButton(this, "status", this.onStatusFilterChanged,
         {
            type: "menu",
            menu: "status-menu",
            lazyloadmenu: false
         });
         
         this.widgets.lookseq = Alfresco.util.createYUIButton(this, "lookseq", this.onLookSeqFilterChanged,
         {
             type: "checkbox"
         });
         this.widgets.lookseq.value = false;
         
         // DataSource definition
         this.widgets.dataSource = new YAHOO.util.DataSource(this.collaborations,
         {
            responseType: YAHOO.util.DataSource.TYPE_JSARRAY
         });

         // DataTable column defintions
         var columnDefinitions =
         [
            { key: "name", label: this.msg("cggh.label.name"), sortable: true, formatter: this.bind(this.renderCellName) },
            { key: "title", label: this.msg("cggh.label.title"), sortable: true, formatter: this.bind(this.renderCellTitle) },
            { key: "detail", label: this.msg("cggh.label.description"), sortable: false, formatter: this.bind(this.renderCellDetail) },
            { key: "projStatus", label: this.msg("cggh.metadata.collaborationStatus"), sortable: true, formatter: this.bind(this.renderCellProjectStatus) },
            { key: "enqStatus", label: this.msg("cggh.metadata.enquiryStatus"), sortable: true, formatter: this.bind(this.renderCellEnquiryStatus) },
            { key: "liaision", label: this.msg("cggh.metadata.liaison"), sortable: true, formatter: this.bind(this.renderCellLiaison) },
            { key: "mainContact", label: this.msg("cggh.metadata.contacts"), sortable: true, formatter: this.bind(this.renderCellPrimaryContact) },
            { key: "species", label: this.msg("cggh.metadata.species"), sortable: true, formatter: this.bind(this.renderCellSpecies) },
            { key: "country", label: this.msg("cggh.metadata.sampleCountry"), sortable: true, formatter: this.bind(this.renderCellCountries) },
            { key: "notes", label: this.msg("cggh.metadata.notes"), sortable: true, formatter: this.bind(this.renderCellNotes) }
            ];
         var lsCols = 
         [
            { key: "sTitle", label: this.msg("cggh.external.solaris.title"), hidden: true, sortable: true, formatter: this.bind(this.renderCellSolarisTitle) },
            { key: "sPi", label: this.msg("cggh.external.solaris.pi"), hidden: true, sortable: true, formatter: this.bind(this.renderCellSolarisPI) },
            { key: "sOther", label: this.msg("cggh.external.solaris.otherPeople"), hidden: true, sortable: true, formatter: this.bind(this.renderCellSolarisOtherPeople) }
         ];

        
        var cols = columnDefinitions.concat(lsCols);
        columnDefinitions = cols;
        
         // DataTable definition
         this.widgets.dataTable = new YAHOO.widget.DataTable(this.id + "-collaborations", columnDefinitions, this.widgets.dataSource,
         {
            MSG_EMPTY: this.msg("message.datatable.loading"),
            draggableColumns: true,
            paginator: YAHOO.widget.Paginator
         });

         // Override abstract function within DataTable to set custom empty message
         this.widgets.dataTable.doBeforeLoadData = function Collaborations_doBeforeLoadData(sRequest, oResponse, oPayload)
         {
            if ((oResponse.results.length === 0) || (oResponse.results.length === 1 && oResponse.results[0].shortName === "swsdp"))
            {
               oResponse.results.unshift(
               {
                  isInfo: true,
                  title: me.msg("empty.title"),
                  description: me.msg("empty.description") + (oResponse.results.length === 1 ? "<p>" + me.msg("empty.description.sample-collaboration") + "</p>" : "")
               });
            }
            return true;
         };


         /**
          * Hook favourite collaboration events
          */
         var registerEventHandler = function Collaborations_onReady_registerEventHandler(cssClass, fnHandler)
         {
            var fnEventHandler = function Collaborations_onReady_fnEventHandler(layer, args)
            {
               var owner = YAHOO.Bubbling.getOwnerByTagName(args[1].anchor, "div");
               if (owner !== null)
               {
                  fnHandler.call(me, args[1].target.offsetParent, owner);
               }

               return true;
            };
            YAHOO.Bubbling.addDefaultAction(cssClass, fnEventHandler);
         };

         registerEventHandler(FAV_EVENTCLASS, this.onFavouriteCollaboration);
         registerEventHandler(IMAP_EVENTCLASS, this.onImapFavouriteCollaboration);

         // Enable row highlighting
         this.widgets.dataTable.subscribe("rowMouseoverEvent", this.widgets.dataTable.onEventHighlightRow);
         this.widgets.dataTable.subscribe("rowMouseoutEvent", this.widgets.dataTable.onEventUnhighlightRow);

         // Load collaborations & preferences
         this.loadCollaborations();
      },

      /**
       * Date drop-down changed event handler
       *
       * @method onTypeFilterChanged
       * @param p_sType {string} The event
       * @param p_aArgs {array}
       */
      onTypeFilterChanged: function Collaborations_onTypeFilterChanged(p_sType, p_aArgs)
      {
         var menuItem = p_aArgs[1];
         if (menuItem)
         {
            this.widgets.type.set("label", menuItem.cfg.getProperty("text"));
            this.widgets.type.value = menuItem.value;

            // Save preferences and load collaborations afterwards
            this.services.preferences.set(PREFERENCES_COLLABORATIONS_DASHLET_FILTER, menuItem.value,
            {
               successCallback:
               {
                  fn: this.loadCollaborations,
                  scope: this
               }
            });
         }
      },

      onStatusFilterChanged: function Collaborations_onStatusFilterChanged(p_sType, p_aArgs)
      {
         var menuItem = p_aArgs[1];
         if (menuItem)
         {
            this.widgets.status.set("label", menuItem.cfg.getProperty("text"));
            this.widgets.status.value = menuItem.value;

          
            this.loadCollaborations();
          
         }
      },
      
      onLookSeqFilterChanged: function Collaborations_onLookSeqFilterChanged(p_sType, p_aArgs)
      {
         
         this.widgets.lookseq.value = p_sType.newValue;
                   
         if (this.widgets.lookseq.value) {
        	 this.widgets.dataTable.showColumn("sTitle");
        	 this.widgets.dataTable.showColumn("sPi");
        	 this.widgets.dataTable.showColumn("sOther");
         } else {
        	 this.widgets.dataTable.hideColumn("sTitle");
        	 this.widgets.dataTable.hideColumn("sPi");
        	 this.widgets.dataTable.hideColumn("sOther");
         }
         this.loadCollaborations();
         
      },
      /**
       * Load collaborations list
       *
       * @method loadCollaborations
       */
      loadCollaborations: function Collaborations_loadCollaborations()
      {
         // Load collaborations
         Alfresco.util.Ajax.request(
         {
            //url: Alfresco.constants.PROXY_URI + "api/people/" + encodeURIComponent(Alfresco.constants.USERNAME) + "/sites?roles=user&size=" + this.options.listSize,
        	 url: Alfresco.constants.PROXY_URI +  "cggh/collaborations",
            successCallback:
            {
               fn: this.onCollaborationsLoaded,
               scope: this
            }
         });
      },

     
      loadSolaris: function Collaborations_loadSolaris(p_items)
      {
    	  if (this.widgets.lookseq.value) {
         // Load collaborations
         Alfresco.util.Ajax.request(
         {
            //url: Alfresco.constants.PROXY_URI + "api/people/" + encodeURIComponent(Alfresco.constants.USERNAME) + "/sites?roles=user&size=" + this.options.listSize,
        	 //Requires a proxy to https://lookseq.sanger.ac.uk/cgi-bin/pipeline_status/mystudies.pl?query=get_details
        	 //Due to cross site scripting security
        	 url: '/pipeline_status/mystudies.pl',
        	 requestContentType: Alfresco.util.Ajax.JSON, // Set to JSON if json should be used
        	 responseContentType: Alfresco.util.Ajax.JSON, // Set to JSON if json should be used
        	 dataObj: { query: 'get_details'},
        	 method: Alfresco.util.Ajax.GET,
        	 successCallback:
            {
               fn: this.onSolarisLoaded,
               obj: p_items,
               scope: this
            },
            failureCallback: {
            	fn: this.onSolarisLoaded,
                obj: p_items,
            	scope: this
            }
         });
    	  } else {
    		  this.onSolarisLoaded(null, p_items);
    	  }
      },
      /**
       * Retrieve user preferences after collaborations data has loaded
       *
       * @method onCollaborationsLoaded
       * @param p_response {object} Response from "api/people/{userId}/collaborations" query
       */
      onSolarisLoaded: function Collaborations_onSolarisLoaded(p_response, p_items)
      {
    	  //Alfresco studies
    	  var items = p_items.collaborationNodes;

    	  var newItems = [];
    	  //Solaris projects - ignore if connection failed
    	if (p_response && p_response.json) {
    	  var projects = p_response.json.data.projects;
    	  for (var key in projects)
    	  {
    		  var project = projects[key];
    		  var found = false;

        	  for (i = 0, numItems = items.length; i < numItems; i++)
    		  {
    			var item = items[i];
    			var words = item.name.split(" ");
    			if (words.length > 1)
    			{
    			var item_code = words[1];
    				if (item_code == project.project_code) 
    				{
    				  found = true;
    				  item.solaris_people = project.people;
    				  item.solaris_title = project.title;
    				  break;
    				}
    			}
    		  }
    		  if (!found) {
    			  var newItem = {
    					  "solaris_people": "project.people",
    					  "solaris_title":  "project.title"
    			  };
    			  newItems.push(newItem);
    		  }
    	  }
    	}
    	  //Could merge items and newItems if you want to see projects in Solaris
    	  //but not in Alfresco
         // Load preferences (after which the appropriate collaborations will be displayed)
         this.services.preferences.request(PREFERENCES_COLLABORATIONS,
         {
            successCallback:
            {
               fn: this.onPreferencesLoaded,
               scope: this,
               obj: items
            }
         });
      },
      /**
       * Retrieve user preferences after collaborations data has loaded
       *
       * @method onCollaborationsLoaded
       * @param p_response {object} Response from "api/people/{userId}/collaborations" query
       */
      onCollaborationsLoaded: function Collaborations_onCollaborationsLoaded(p_response)
      {
          this.loadSolaris(p_response.json);
      },

      /**
       * Process response from collaborations and preferences queries
       *
       * @method onPreferencesLoaded
       * @param p_response {object} Response from "api/people/{userId}/preferences" query
       * @param p_items {object} Response from "api/people/{userId}/collaborations" query
       */
      onPreferencesLoaded: function Collaborations_onPreferencesLoaded(p_response, p_items)
      {
         var favs = {},
            imapfavs = {},
            i, j, k, l,
            ii = 0;

         // Save preferences
         if (p_response.json.org)
         {
            favs = p_response.json.org.cggh.share.collaborations.favourites;
            if (typeof(favs) === "undefined")
            {
               favs = {};
            } 
            imapfavs = p_response.json.org.cggh.share.collaborations.imapFavourites;
         }

         // Select the preferred filter in the ui
         var filter = Alfresco.util.findValueByDotNotation(p_response.json, PREFERENCES_COLLABORATIONS_DASHLET_FILTER, "all");
         filter = this.options.validFilters.hasOwnProperty(filter) ? filter : "all";
         this.widgets.type.set("label", this.msg("filter." + filter));
         this.widgets.type.value = filter;
         //Not saved as preferences
         if (!this.widgets.status.value) {
        	 this.widgets.status.value = "all";
         }
         
         // Display the toolbar now that we have selected the filter
         Dom.removeClass(Selector.query(".toolbar div", this.id, true), "hidden");

         for (i = 0, j = p_items.length; i < j; i++)
         {
            p_items[i].isFavourite = typeof(favs[p_items[i].nodeRef]) == "undefined" ? false : favs[p_items[i].nodeRef];
            if (imapfavs)
            {
               p_items[i].isIMAPFavourite = typeof(imapfavs[p_items[i].nodeRef]) == "undefined" ? false : imapfavs[p_items[i].nodeRef];
            }
         }

         this.collaborations = [];
         for (i = 0, j = p_items.length; i < j; i++)
         {
            var collaboration = YAHOO.lang.merge({}, p_items[i]);

            if (this.filterAccept(this.widgets.type.value, this.widgets.status.value, collaboration))
            {
               this.collaborations[ii] = collaboration;
               ii++;
            }
         }

         this.collaborations.sort(function(a, b)
         {
            var name1 = a.title ? a.title.toLowerCase() : a.name.toLowerCase(),
                name2 = b.title ? b.title.toLowerCase() : b.name.toLowerCase();
            return (name1 > name2) ? 1 : (name1 < name2) ? -1 : 0;
         });

         var successHandler = function Collaborations_onCollaborationsUpdate_success(sRequest, oResponse, oPayload)
         {
            oResponse.results=this.collaborations;
            this.widgets.dataTable.set("MSG_EMPTY", "");
            this.widgets.dataTable.onDataReturnInitializeTable.call(this.widgets.dataTable, sRequest, oResponse, oPayload);
         };

         this.widgets.dataSource.sendRequest(this.collaborations,
         {
            success: successHandler,
            scope: this
         });
      },

      /**
       * Determine whether a given collaboration should be displayed or not depending on the current filter selection
       * @method filterAccept
       * @param filter {string} Filter to set
       * @param collaboration {object} Collaboration object literal
       * @return {boolean}
       */
      filterAccept: function Collaborations_filterAccept(filter, statusFilter, collaboration)
      {
    	  var ret = false;
         switch (filter)
         {
            case "all":
               ret = true;
               break;
            case "favs":
               ret = (collaboration.isFavourite || (this.options.imapEnabled && collaboration.isIMAPFavourite));
               break;
         }
         switch (statusFilter)
         {
            case "all":
              //leave unchanged
               break;
            default:
               ret = ret && (collaboration.collaborationStatus == statusFilter);
               break;
         }
         return ret;
      },

      /**
       * Generate "Favourite" UI
       *
       * @method generateFavourite
       * @param record {object} DataTable record
       * @return {string} HTML mark-up for Favourite UI
       */
      generateFavourite: function Collaborations_generateFavourite(record)
      {
         var html = "";

         if (record.getData("isFavourite"))
         {
            html = '<a class="favourite-action ' + FAV_EVENTCLASS + ' enabled" title="' + this.msg("favourite.collaboration.remove.tip") + '" tabindex="0"></a>';
         }
         else
         {
            html = '<a class="favourite-action ' + FAV_EVENTCLASS + '" title="' + this.msg("favourite.collaboration.add.tip") + '" tabindex="0">' + this.msg("favourite.collaboration.add.label") + '</a>';
         }

         return html;
      },

      /**
       * Generate "IMAP Favourite" UI
       *
       * @method generateIMAPFavourite
       * @param record {object} DataTable record
       * @return {string} HTML mark-up for Favourite UI
       */
      generateIMAPFavourite: function Collaborations_generateIMAPFavourite(record)
      {
         var html = "";

         if (record.getData("isIMAPFavourite"))
         {
            html = '<a class="favourite-action favourite-imap ' + IMAP_EVENTCLASS + ' enabled" title="' + this.msg("favourite.imap-collaboration.remove.tip") + '" tabindex="0"></a>';
         }
         else
         {
            html = '<a class="favourite-imap ' + IMAP_EVENTCLASS + '" title="' + this.msg("favourite.imap-collaboration.add.tip") + '" tabindex="0">' + this.msg("favourite.imap-collaboration.add.label") + '</a>';
         }

         return html;
      },

    

      /**
       * Icon custom datacell formatter
       *
       * @method renderCellName
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellName: function Collaborations_renderCellName(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");
         
         var collaboration = oRecord.getData();
         
      	var objectId = collaboration.nodeRef,
      	title = collaboration.name;
         var desc = '<div class="study-title"><a href="' + Alfresco.constants.URL_PAGECONTEXT + 'folder-details?nodeRef=' + objectId + '" class="theme-color-1">' + $html(title) + '</a></div>';
         /* Favourite / IMAP / (Likes) */
         desc += '<div class="detail detail-social">';
         desc +=    '<span class="item item-social">' + this.generateFavourite(oRecord) + '</span>';
         if (this.options.imapEnabled)
         {
            desc +=    '<span class="item item-social item-separator">' + this.generateIMAPFavourite(oRecord) + '</span>';
         }
         
         desc += '</div>';
         
         elCell.innerHTML = desc;
      },

      /**
       * Name & description custom datacell formatter
       */
      renderCellTitle: function MS_oR_renderCellTitle(elCell, oRecord, oColumn, oData)
      {
    	  var collaboration = oRecord.getData();
         var desc = "";
         
         desc += '<h3 class="collaboration-title"><a href="' + Alfresco.constants.URL_PAGECONTEXT + 'site/sequencing/documentlibrary#filter=path|/Collaborations/' + collaboration.name + '" class="theme-color-1">' + $html(collaboration.title) + '</a></h3>';
         
        
         elCell.innerHTML = desc;
      },
      
      /**
       * Name & description custom datacell formatter
       *
       * @method renderCellDetail
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellDetail: function Collaborations_renderCellDetail(elCell, oRecord, oColumn, oData)
      {
         var collaboration = oRecord.getData(),
            description = '<span class="faded">' + this.msg("details.description.none") + '</span>',
            desc = "";

         if (collaboration.isInfo)
         {
           
            desc += '<span>' + collaboration.description + '</span></div>';
         }
         else
         {
            // Description non-blank?
            if (collaboration.description && collaboration.description !== "")
            {
               description = $links($html(collaboration.description));
            }

            
            desc += '<div class="detail"><span>' + description + '</span></div>';

          
         }

         elCell.innerHTML = desc;
      },


      /**
       * Actions custom datacell formatter
       *
       * @method renderCellProjectStatus
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellProjectStatus: function Collaborations_renderCellProjectStatus(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

        
         elCell.innerHTML = collaboration.collaborationStatus;
      },

      /**
       * Actions custom datacell formatter
       *
       * @method renderCellEnquiryStatus
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellEnquiryStatus: function Collaborations_renderCellEnquiryStatus(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

        
         elCell.innerHTML = collaboration.enquiryStatus;
      },

      /**
       * Actions custom datacell formatter
       *
       * @method renderCellPrimaryContact
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellPrimaryContact: function Collaborations_renderCellPrimaryContact(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

         var output = [];
         
         if (collaboration.contacts) {
        	for(i = 0, j = collaboration.contacts.length;i < j; i++) {
    		 	var person = collaboration.contacts[i];
    		 	output.push(person.name);
    	 	}
         }
        
         elCell.innerHTML = output;
      },
      /**
       * Actions custom datacell formatter
       *
       * @method renderCellLiaison
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellLiaison: function Collaborations_renderCellLiaison(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

         if (collaboration.liaison) {
        	 var liaison = collaboration.liaison.firstName + " " + collaboration.liaison.lastName;
        
        	 elCell.innerHTML = liaison;
         }
      },
      /**
       * Actions custom datacell formatter
       *
       * @method renderCellSpecies
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellSpecies: function Collaborations_renderCellSpecies(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

        
         elCell.innerHTML = collaboration.species;
      },
      /**
       * Actions custom datacell formatter
       *
       * @method renderCellCountries
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellCountries: function Collaborations_renderCellCountries(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

        
         elCell.innerHTML = collaboration.countries;
      },
      /**
       * Actions custom datacell formatter
       *
       * @method renderCellNotes
       * @param elCell {object}
       * @param oRecord {object}
       * @param oColumn {object}
       * @param oData {object|string}
       */
      renderCellNotes: function Collaborations_renderCellNotes(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

        
         elCell.innerHTML = collaboration.notes;
      },
      renderCellSolarisTitle: function Collaborations_renderCellSolarisTitle(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();

         if (collaboration.solaris_title) {
        	 elCell.innerHTML = collaboration.solaris_title;
         }
      },
      renderCellSolarisPI: function Collaborations_renderCellSolarisPI(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();
         var output = [];
         
         if (collaboration.solaris_people) {
        	 for(i = 0, j = collaboration.solaris_people.length;i < j; i++) {
        		 var person = collaboration.solaris_people[i];
        		 if (person.is_pi == 1) {
        			 output.push(person.fullname);
        		 }
        	 }
         }
        
         elCell.innerHTML = output;
      },
      renderCellSolarisOtherPeople: function Collaborations_renderCellSolarisOtherPeople(elCell, oRecord, oColumn, oData)
      {
         Dom.setStyle(elCell, "width", oColumn.width + "px");
         Dom.setStyle(elCell.parentNode, "width", oColumn.width + "px");

         var collaboration = oRecord.getData();
         var output = [];
         
         if (collaboration.solaris_people) {
        	 for(i = 0, j = collaboration.solaris_people.length;i < j; i++) {
        		 var person = collaboration.solaris_people[i];
        		 if (person.is_pi == 0) {
        			 output.push(person.fullname);
        		 }
        	 }
         }
         elCell.innerHTML = output;
      },
      /**
       * Adds an event handler that adds or removes the collaboration as favourite collaboration
       *
       * @method onFavouriteCollaboration
       * @param row {object} DataTable row representing collaboration to be actioned
       */
      onFavouriteCollaboration: function Collaborations_onFavouriteCollaboration(row)
      {
         var record = this.widgets.dataTable.getRecord(row),
            collaboration = record.getData(),
            collaborationId = collaboration.nodeRef;

         collaboration.isFavourite = !collaboration.isFavourite;

         this.widgets.dataTable.updateRow(record, collaboration);

         // Assume the call will succeed, but register a failure handler to replace the UI state on failure
         var responseConfig =
         {
            failureCallback:
            {
               fn: function Collaborations_onFavouriteCollaboration_failure(event, obj)
               {
                  // Reset the flag to it's previous state
                  var record = obj.record,
                     collaboration = record.getData();

                  collaboration.isFavourite = !collaboration.isFavourite;
                  this.widgets.dataTable.updateRow(record, collaboration);
                  Alfresco.util.PopupManager.displayPrompt(
                  {
                     text: this.msg("message.save.failure")
                  });
               },
               scope: this,
               obj:
               {
                  record: record
               }
            },
            successCallback:
            {
               fn: function Collaborations_onFavouriteCollaboration_success(event, obj)
               {
                  var record = obj.record,
                     collaboration = record.getData();

                  YAHOO.Bubbling.fire(collaboration.isFavourite ? "favouriteCollaborationAdded" : "favouriteCollaborationRemoved", collaboration);
               },
               scope: this,
               obj:
               {
                  record: record
               }
            }
         };

         this.services.preferences.set(FAVOURITE_COLLABORATIONS + "." + collaborationId, collaboration.isFavourite, responseConfig);
      },

      /**
       * Adds an event handler that adds or removes the collaboration as favourite collaboration
       *
       * @method onImapFavouriteCollaboration
       * @param row {object} DataTable row representing collaboration to be actioned
       */
      onImapFavouriteCollaboration: function Collaborations_onImapFavouriteCollaboration(row)
      {
         var record = this.widgets.dataTable.getRecord(row),
            collaboration = record.getData(),
            collaborationId = collaboration.nodeRef;

         collaboration.isIMAPFavourite = !collaboration.isIMAPFavourite;

         this.widgets.dataTable.updateRow(record, collaboration);

         // Assume the call will succeed, but register a failure handler to replace the UI state on failure
         var responseConfig =
         {
            failureCallback:
            {
               fn: function Collaborations_onImapFavouriteCollaboration_failure(event, obj)
               {
                  // Reset the flag to it's previous state
                  var record = obj.record,
                     collaboration = record.getData();

                  collaboration.isIMAPFavourite = !collaboration.isIMAPFavourite;
                  this.widgets.dataTable.updateRow(record, collaboration);
                  Alfresco.util.PopupManager.displayPrompt(
                  {
                     text: this.msg("message.save.failure")
                  });
               },
               scope: this,
               obj:
               {
                  record: record
               }
            }
         };

         this.services.preferences.set(IMAP_FAVOURITE_COLLABORATIONS + "." + collaborationId, collaboration.isIMAPFavourite, responseConfig);
      },

 
      /**
       * Searches the current recordSet for a record with the given parameter value
       *
       * @method _findRecordByParameter
       * @param p_value {string} Value to find
       * @param p_parameter {string} Parameter to look for the value in
       */
      _findRecordByParameter: function Collaborations__findRecordByParameter(p_value, p_parameter)
      {
        var recordSet = this.widgets.dataTable.getRecordSet();
        for (var i = 0, j = recordSet.getLength(); i < j; i++)
        {
           if (recordSet.getRecord(i).getData(p_parameter) === p_value)
           {
              return recordSet.getRecord(i);
           }
        }
        return null;
      }
   });
})();