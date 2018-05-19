!(function (angular, window, undefined) {
  var moduleLocalStorageTable = angular.module('dj-localStorage-table', []);
  /**
   * 本地存贮数据表工厂
   */
  moduleLocalStorageTable.factory('LocalStorageTable', ['$q', function ($q) {
      class LocalStorageTable {
        constructor(tableName) {
          this.tableName = tableName;
          this.initTable();
        }

        initTable() {
          var str = window.localStorage.getItem(this.tableName) || JSON.stringify({ rows: [] });
          this.data = JSON.parse(str);
          this.rows = this.data.rows;
          this.maxId = 0;
          this.rows.map(row => {
            if (row.id > this.maxId) this.maxId = row.id;
          })
        }

        autoInsertId() {
          return ++this.maxId;
        }

        saveToLocalStorage() {
          window.localStorage.removeItem(this.tableName);
          window.localStorage.setItem(this.tableName, JSON.stringify(this.data));
        }

        insert(data, dontSave) {
          var id = this.autoInsertId();
          this.rows.push(angular.extend({
            id: id
          }, data));
          !dontSave && this.saveToLocalStorage();
          return $q.when(id);
        }

        select(where) {
          where = where || {};
          var list = this.rows.filter(row => {
            for (var k in where) {
              if (row[k] != where[k]) return false;
            }
            return true;
          });
          return $q.when(angular.merge([], list));
        }

        update(where, value, insertIfNotExist) {
          where = where || {};
          var list = this.rows.filter(row => {
            for (var k in where) {
              if (row[k] != where[k]) return false;
            }
            return true;
          });
          if (!list[0]) {
            if (!insertIfNotExist) return $q.reject('无此数据');
            return this.insert(angular.extend({}, where, value)).then(id => {
              return this.rows.find(row => row.id == id);
            });
          }
          angular.extend(list[0], value);
          this.saveToLocalStorage();
          return $q.when(angular.merge({}, list[0]));
        }
      }

      return LocalStorageTable;

    }]);

  moduleLocalStorageTable.factory("LocalTable", ['$http', '$q', 'LocalStorageTable', function ($http, $q, LocalStorageTable) {

    function Table(name) {
      if (!Table[name]) {
        Table[name] = new LocalStorageTable("fac-table-" + name);
      }
      return Table[name];
    }

    var DEFAULT_OPTIONS = {
      name: 'default',
      ac: 'default',
      empty: "",
    };

    function LocalTable(ac, name, empty) {
      if (!(this instanceof LocalTable)) { return new LocalTable(name, ac, empty); }
      var options = {};
      if (angular.isObject(ac)) {
        options = ac;
      }
      else if (angular.isString(ac)) {
        options.ac = ac;
        options.empty = empty || "";
        if (!ac || !angular.isString(name)) {
          options.name = name;
        }
      }
      this.options = angular.mergy({}, DEFAULT_OPTIONS, options);
      this.table = Table(this.options.name);
    }
    LocalTable.prototype = {

      load: function () {
        return this.table.select({ ac: this.options.ac }).then(list => list[0]).catch(e => this.options.empty);
      },
      save: function (data) {
        return this.table.update({ ac: this.options.ac }, data, true)
      },

    }

    LocalTable.load = function (name, ac, empty) {
      return Table(name).select({ ac }).then(list => list[0] || empty).catch(e => empty);
    };
    LocalTable.save = function (name, ac, data) {
      return Table(name).update({ ac }, data, true);
    };

    return LocalTable
  }]);


})(window.angular, window);
