/* jQuery treeTable Plugin 2.2.2-dev - http://ludo.cubicphuse.nl/jquery-plugins/treeTable/ */
(function($) {
  
  var publicFunctions = {
    expand: expand,
    collapse: collapse,
    lazyLoadData: lazyLoadData,
    resetParent: resetParent,
    toggle: toggleBranch,
    toggleBranch: toggleBranch
  };

  $.fn.treeTable = function(opts) {
    if (typeof opts === "string") {
      var args = Array.prototype.slice.call(arguments, 1);
      return this.each(function() {
        var options = optionsForNode(this);
        if (publicFunctions[opts] === null) return;
        (publicFunctions[opts]).apply(options, [$(this)].concat(args));
      });
    }

    var options = $.extend({}, $.fn.treeTable.defaults, opts);
    
    return this.each(function() {
      // Only operate on tables, nothing else.
      if (!$(this).is("table")) return;

      // Save the options to the jquery table object
      $(this).data("treeTable", options);
      var table = $(this).addClass("treeTable").addClass(options.tableClass);
      var nodes = table.find("tbody tr");
      table.find("tbody td").css("padding-left", options.rootIndent);
      nodes.each(function() {
        // Initialize root nodes only whenever possible
        if (typeof options.lazy_load === "object") {
          $(this).addClass("lazyLoading");
        };
        initialize($(this));
      });
    });
  };
  
  $.fn.treeTable.defaults = {
    childPrefix: "child-of-",
    drop_location: "top",
    expandable: true,
    indent: 19,
    rootIndent: 19,
    initialState: "collapsed",
    treeColumn: 0,
    trustParent: false,

    tableClass:    "ui-widget",
    expanderClass: "ui-icon",
    closeClass:    "ui-icon-carat-1-e",
    openClass:     "ui-icon-carat-1-se",
    waitClass:     "ui-icon-clock",
    
    onAppend: null //function(destination) {},
  };

  // Recursively hide all node's children in a tree
  function collapse(node) {
    if (!$(node).is("tr")) return;
    var options = optionsForNode(node);
    node.removeClass("expanded").addClass("collapsed");
    removeIconClasses(node.find("span.expander")).addClass(options.closeClass);

    childrenOf(node).each(function() {
      var child = $(this);
      initialize(child);
      
      if(!child.hasClass("collapsed") && child.hasClass("parent")) {
        collapse(child);
      }
      
      child.hide();
    });
    
    return node;
  }
  
  // Recursively show all node's children in a tree
  function expand(node) {
    if (!$(node).is("tr")) return;
    var options = optionsForNode(node);
    node.removeClass("collapsed").addClass("expanded");
    if (node.hasClass("lazyload")) {
      removeIconClasses(node.find("span.expander")).addClass(options.waitClass);
      do_lazyload(node, node.attr('id'));
      return node;
    }
    removeIconClasses(node.find("span.expander")).addClass(options.openClass);
    childrenOf(node).each(function() {
      initialize($(this));
            
      if($(this).is(".expanded.parent")) {
        expand($(this));
      }
      
      $(this).show();
    });

    return node;
  };

  // Add an entire branch to +destination+
  $.fn.appendBranchTo = function(destination) {
    var node = $(this);
    var options = optionsForNode(node);
    var parent = parentOf(node);
    
    var ancestorNames = $.map(ancestorsOf($(destination)), function(a) { return a.id; });
    
    // Append branch at bottom of destination's branch when dropped on destination
    if(options.drop_location == "bottom") {
      move_to = childrenOf($(destination)).reverse()[0];
    } else {
      move_to = destination;
    }
    
    // Conditions:
    // 1: +node+ should not be inserted in a location in a branch if this would
    //    result in +node+ being an ancestor of itself.
    // 2: +node+ should not have a parent OR the destination should not be the
    //    same as +node+'s current parent (this last condition prevents +node+
    //    from being moved to the same location where it already is).
    // 3: +node+ should not be inserted as a child of +node+ itself.
    if($.inArray(node.attr("id"), ancestorNames) == -1 && (!parent || (destination.id != parent.attr("id"))) && destination.id != node.attr("id")) {
      
      if(parent) { node.removeClass(options.childPrefix + parent.attr("id")); }
      
      node.addClass(options.childPrefix + destination.id);
      resetIndent(node);
      indent(node, options.indent);

      move(node, move_to); // Recursively move nodes to new location
      if (typeof options.onAppend == "function") options.onAppend.apply(node, [$(destination)]);

      // After a node has been moved, check to see if it's parent and the destination need to change icons from "has children" to "no children" or vice-versa.
      resetParent(parent);
      resetParent(destination);
    }

    return this;
  };

  $.fn.initializeNode = function() {
    initialize($(this));
  };

  // Add reverse() function from JS Arrays
  $.fn.reverse = function() {
    return this.pushStack(this.get().reverse(), arguments);
  };

  // Toggle an entire branch
  function toggleBranch(node) {
    if (!$(node).is("tr")) return;
    if(node.hasClass("collapsed")) {
      expand(node);
    } else {
      collapse(node);
    }

    return this;
  };

  function ancestorsOf(node) {
    var ancestors = [];
    while(node = parentOf(node)) {
      if (node.length == 0) break;
      ancestors[ancestors.length] = node[0];
    }
    return ancestors;
  };
  
  function childrenOf(node) {
    var options = optionsForNode(node);
    return node.closest(".treeTable").find("tr." + options.childPrefix + node.attr("id"));
  };

  function indent(node, value) {
    var options = optionsForNode(node);
    var cell = node.children("td").eq(options.treeColumn);
    var padding = parseInt(cell.css("padding-left"), 10) + value;

    cell.css("padding-left", padding + "px");
    
    if(node.hasClass("parent")) {
      childrenOf(node).each(function() {
        resetIndent($(this));
        indent($(this), value);
      });
    }
  };

  function initialize(node) {
    if(node.hasClass("initialized")) return;
    var options = optionsForNode(node);

    node.addClass("initialized");

    var childNodes;
    if (!options.trustParent)
    {

      childNodes = childrenOf(node);
      if(!node.hasClass("parent") && childNodes.length > 0) {
        node.addClass("parent");
      }
    }
    
    if (node.hasClass("parent")) {
      if (childNodes == undefined) childNodes = childrenOf(node);

      if (typeof options.lazy_load === "object" && childNodes.length === 0) {
        node.addClass("lazyload");
      }

      childNodes.each(function() {
        resetIndent($(this));
        indent($(this), options.indent);
      });
      if(options.expandable) {
        var cell = node.children("td").eq(options.treeColumn);
        cell.prepend('<span style="float: left; margin-left: -' + options.indent + 'px" class="expander ' + options.expanderClass + '"></span>');
        $(cell).find("span.expander:first").click(function() { toggleBranch(node); });
      
        // Check for a class set explicitly by the user, otherwise set the default class
        if(!(node.hasClass("expanded") || node.hasClass("collapsed"))) {
          node.addClass(options.initialState);
        }
        
        if(node.hasClass("collapsed")) {
          collapse(node);
        } else if (node.hasClass("expanded")) {
          expand(node);
        }
      }
    }

    if (typeof options.lazy_load === "object") {
      if (node.hasClass("lazyLoading")) {
        if (typeof options.lazy_load.complete == "function") options.lazy_load.complete(node);
        node.removeClass("lazyLoading");
      }
    }
  };
  
  function move(node, destination) {
    node.insertAfter(destination);
    childrenOf(node).reverse().each(function() { move($(this), node); });
  };
  
  function parentOf(node, options) {
    return $("#" + parentIdOf(node, options));
    /*
    if (options === undefined) options = optionsForNode(node);
    var classNames = node.attr("className").split(' ');
    
    for(key in classNames) {
      if(classNames[key].match(options.childPrefix)) {
        return $("#" + classNames[key].substring(options.childPrefix.length));
      }
    }
    */
  };

  function parentIdOf(node, options) {
    if (options === undefined) options = optionsForNode(node);
    var classNames = node.attr("className").split(' ');
    
    for(key in classNames) {
      if(classNames[key].match(options.childPrefix)) {
        return classNames[key].substring(options.childPrefix.length);
      }
    }
  };

  function resetIndent(node) {
    var options = optionsForNode(node);
    var parent = parentOf(node);
    var parent_cell = parent.children("td").eq(options.treeColumn);
    var padding = parseInt(parent_cell.css("padding-left"), 10);

    var cell = node.children("td").eq(options.treeColumn);
    cell.css("padding-left", padding + "px");
    
  };

  function removeIconClasses(node) {
    var options = optionsForNode(node);
    if (options == null) return node;
    node.removeClass([options.closeClass, options.openClass, options.waitClass].join(" "));
    return node;
  }

  $.fn.treeTable.parentOf = function(node) {
    return parentOf(node);
  }

  function addToParents(html, parent_table) {
    options = optionsForNode(parent_table);
    parent_table.append(html);
    html.reverse().each(function() {
      var parent_node = parentOf($(this));
      //parent.after(this);
      $(this).insertAfter(parent_node);
      //$(this).after(parent_node);
    });
  }

  function lazyLoadData(parent_node, data) {
    var options = optionsForNode(parent_node);
    var table_root = parent_node.closest(".treeTable");
    var lazy_load = options.lazy_load;
    var html = $($.grep(lazy_load.load_data(data), function(v) {
      // Remove everything that already has an ID
      return table_root.find('#'+v.id).length === 0;
    }));

    var parents = {};
    var parent_count = 0;

    // Always consider a parent_node that is a tr in the parent reset.
    if (parent_node.is("tr"))
    {
      parents[parent_node.attr('id')] = $("<div></div>");
      parent_count = 1;
    }

    html.each(function() {
      var parent_id = parentIdOf($(this), options);
      if (parents[parent_id] === undefined)
      {
        parents[parent_id] = $("<div></div>");
        parent_count = parent_count+1;
      }
      parents[parent_id].append($(this));
    });
    // Parents will either be in the tree or in html.  Append each group
    //  to the parent's real place and finish the parent
    $.each(parents, function(k, v) {
      var p = html.add(table_root.find('tr')).filter('#'+k);
      //var p = html.add(table_root.find('tr')).filter('#'+k);
      // If there is no such parent, we can't do anything
      if (p.length === 0) return;
      // Make the parent expanded and not lazy-loading
      p.removeClass("collapsed lazyload").addClass("expanded");
      removeIconClasses(p.find("span.expander")).addClass(options.openClass);
      v.find('tr').insertAfter(p);
    });
    html.each(function() {
      resetIndent($(this));
      indent($(this), options.indent);
      initialize($(this).addClass("lazyLoading"));
    });
  }

  function do_lazyload(tnode, node) {
    var options = optionsForNode(tnode);
    var lazy_load = options.lazy_load;
    if (typeof lazy_load.load_url  != "function") return;
    if (typeof lazy_load.load_data != "function") return;
    var url = lazy_load.load_url(node);
    var data = {};
    if (typeof url === "object") {
      data = url.data;
      url = url.url;
    }
    tnode.removeClass("lazyload");
    $.getJSON(url, data, function(data) {
      lazyLoadData(tnode, data);
    });
  }

  function handle_children(node) {
    var options = optionsForNode(node);
    var childNodes = childrenOf(node);
    var cell = node.children("td").eq(options.treeColumn);
    var padding = parseInt(cell.css("padding-left"), 10) + options.indent;

    childNodes.each(function() {
      $(this).children("td").eq(options.treeColumn).css("padding-left", padding + "px");
    });
  }

  function resetParent(node) {
    if (node == null) return;
    var options = optionsForNode(node);
    node = $(node);

    // If this is called, that means we have free reign to decide to make node a parent or not

    // If it's a lazy load or not expandable, forget it
    if (node.hasClass("lazyload")) return;
    if (!options.expandable) return;

    // Clear the expander
    node.find("span.expander").remove();

    // Check to see if it has children
    if (childrenOf(node).length > 0) {
      node.addClass("parent");
      // Add the expander span if it's a parent
      var cell = node.children("td").eq(options.treeColumn);
      cell.prepend('<span style="float: left; margin-left: -' + options.indent + 'px" class="expander ' + options.expanderClass + '"></span>');
      cell.find("span.expander").click(function() { toggleBranch(node); });
      if(node.hasClass("collapsed")) {
        collapse(node);
      } else if (node.hasClass("expanded")) {
        expand(node);
      }
    } else {
      node.removeClass("parent");
    }

  }

  function optionsForNode(node) {
    return $(node).closest(".treeTable").data("treeTable");
  }

})(jQuery);
