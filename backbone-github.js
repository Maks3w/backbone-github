window.GitHub = {};

GitHub.token = null;

GitHub.authenticate = function(username, password, options) {
  var postData;
  postData = {};
  if (options.scope != null) {
    postData.scope = options.scope;
  }
  return $.ajax({
    url: "https://api.github.com/authorizations",
    contentType: 'application/json',
    dataType: 'json',
    type: 'POST',
    data: JSON.stringify(postData),
    headers: {
      'Authorization': "Basic " + (btoa("" + username + ":" + password))
    },
    success: function(d, s, x) {
      GitHub.token = d.token;
      if (options.success != null) {
        return options.success(d, s, x);
      }
    },
    error: options.error
  });
};

// ## GitHub.sync
//
// The GitHub sync method is simply a customized version of the
// default Backbone sync mechanism with two improved properties:
//
// 1. It automatically sets an Accept header compatible with the
//    GitHub v3 API.
// 2. It sets the OAuth 2.0 Authorization header if `GitHub.token`
//    exists.
GitHub.sync = function(method, model, options) {
  var extendedOptions;
  extendedOptions = _.extend({
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Accept', 'application/vnd.github+json');
      if (GitHub.token) {
        return xhr.setRequestHeader('Authorization', "bearer " + GitHub.token);
      }
    }
  }, options);
  return Backbone.sync(method, model, extendedOptions);
};

GitHub.Model = Backbone.Model.extend({
  sync: GitHub.sync
});

GitHub.Collection = Backbone.Collection.extend({
  sync: GitHub.sync
});

GitHub.Relations = {
  ownedRepos: function(options) {
    var repos;
    repos = new GitHub.Repos;
    repos.url = typeof this.url === "function" ? this.url() : this.url;
    repos.url += "/repos";
    repos.fetch(options);
    return repos;
  },
  ownedOrgs: function(options) {
    var orgs;
    orgs = new GitHub.Organizations;
    orgs.url = typeof this.url === "function" ? this.url() : this.url;
    orgs.url += "/orgs";
    orgs.fetch(options);
    return orgs;
  }
};

// ## GitHub.User
// 
// The GitHub User model. For information about specific attributes
// that are available on this model, see GitHub's [Users API](http://developer.github.com/v3/users/)
// documentation.
GitHub.User = GitHub.Model.extend({
  
  urlRoot: 'https://api.github.com/users/',
  
  // ### user.repos(options)
  //
  // Fetch associated repositories for this user. Takes
  // a `success` and `error` callback as potential options.
  // Returns a `GitHub.Repos` collection.
  repos: GitHub.Relations.ownedRepos,
  
  // ### user.organizations(options)
  //
  // Fetch associated organizations for this user. Takes
  // a `success` and `error` callback as potential options.
  organizations: GitHub.Relations.ownedOrgs

}, 
{
  // ### GitHub.User.fetch(name, options)
  //
  // Retrieve a user by username. Takes `success` and
  // `error` callbacks.
  //
  //     GitHub.User.fetch('mbleigh', {success: function(u){
  //       console.log(u.toJSON());
  //     }});
  fetch: function(name, options) {
    var user;
    user = new GitHub.User({
      id: name
    });
    user.fetch(options);
    return user;
  }
});

// ## GitHub.Organization
// 
// Represents a GitHub organization. See the [Organization
// API](http://developer.github.com/v3/orgs/) docs on GitHub
// for additional information.
GitHub.Organization = GitHub.Model.extend({
  
  urlRoot: 'https://api.github.com/orgs/',

  // ### org.repos(options)
  // 
  // Fetch the repositories for the instantiated organization.
  // Takes `success` and `error` callbacks. Returns a
  // `GitHub.Repos` collection.
  repos: GitHub.Relations.ownedRepos
}, 
{
  // ### GitHub.Organization.fetch(name, options)
  //
  // Fetch an organization by name. Accepts `success`
  // and `error` callbacks.
  //
  //     GitHub.Organization.fetch('opperator', {success: function(o){
  //       console.log(o.toJSON());
  //     }});
  fetch: function(name, options) {
    var org;
    org = new GitHub.Organization({
      id: name
    });
    org.fetch(options);
    return org;
  }
});

// ## GitHub.Organizations
//
// Collection of multiple organizations. By default will
// be associated to the current user's organizations (you
// must set an `GitHub.token` for that to work.)
GitHub.Organizations = GitHub.Collection.extend({
  url: 'https://api.github.com/user/orgs',
  model: GitHub.Organization
});

// ## GitHub.Repo
//
// Repository model. For more information about attributes
// etc, see the [GitHub Repo](http://developer.github.com/v3/repos/)
// API docs.
GitHub.Repo = GitHub.Model.extend({
  url: function() {
    return this.get('url') || ("https://api.github.com/repos/" + (this.get('path')));
  }
}, 
{
  // ### GitHub.Repo.fetch(owner, name, options)
  //
  // Retrieve a repository knowing its owner and name. Takes
  // `success` and `error` callbacks in options.
  //
  //     GitHub.Repo.fetch('opperator', 'backbone-github', {success: function(r){
  //       console.log(r.toJSON());
  //     }});
  fetch: function(owner, name, options) {
    var repo;
    repo = new GitHub.Repo({
      path: "" + owner + "/" + name
    });
    repo.fetch(options);
    return repo;
  }
});

// ## GitHub.Repos
// 
// Collection of Repo models. Defaults to the current user's
// repositories. Must have set `GitHub.token` for current
// user repo fetch to be successful.
GitHub.Repos = GitHub.Collection.extend({
  url: 'https://api.github.com/user/repos',
  model: GitHub.Repo
});

// ## GitHub.currentUser
//
// A `GitHub.User` corresponding to the authenticated user.
// Note that you must set `GitHub.token` to a valid OAuth 2.0
// token to be able to utilize the current user.
//
// The `currentUser` is not fetched by default, you must run
// `GitHub.currentUser.fetch()` before it will be populated
// with data.
GitHub.currentUser = new GitHub.User();
GitHub.currentUser.url = "https://api.github.com/user";
GitHub.currentUser.urlRoot = null;