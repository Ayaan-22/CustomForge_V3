// server/utils/apiFeatures.js

// Helper: escape regex meta characters to avoid ReDoS
const escapeRegex = (str = "") =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class APIFeatures {
  /**
   * @param {import('mongoose').Query} query        - Mongoose query object, e.g., Model.find()
   * @param {object}                   queryString  - req.query from Express
   * @param {object}                   [options]    - Optional settings
   * @param {string[]}                 [options.searchFields=['name','description']]
   */
  constructor(query, queryString, options = {}) {
    this.query = query;
    this.queryString = queryString || {};
    this.searchFields = options.searchFields || ["name", "description"];
    this.filterCriteria = {};
    this.filteredCount = null;
    this.totalCountValue = null; // renamed property, keep method name totalCount()
  }

  /**
   * Apply filtering, range operators, regex search, and full-text search.
   */
  filter() {
    // 1) Remove special query params
    const queryObj = { ...this.queryString };
    ["page", "sort", "limit", "fields", "search", "textSearch"].forEach(
      (field) => delete queryObj[field]
    );

    // 2) Convert to Mongo operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|ne|in|nin)\b/g,
      (match) => `$${match}`
    );
    const filterCriteria = JSON.parse(queryStr);

    // 3) Add safe regex-based search if `search` present
    if (this.queryString.search) {
      const safe = escapeRegex(this.queryString.search);
      const regex = new RegExp(safe, "i");
      filterCriteria.$or = this.searchFields.map((f) => ({
        [f]: { $regex: regex },
      }));
    }

    // 4) Add MongoDB full-text search if `textSearch` present
    if (this.queryString.textSearch) {
      filterCriteria.$text = { $search: this.queryString.textSearch };
    }

    this.filterCriteria = filterCriteria;
    this.query = this.query.find(filterCriteria);
    return this;
  }

  /**
   * Count documents matching the filtered criteria.
   */
  async count() {
    if (!Object.keys(this.filterCriteria).length) {
      this.filter();
    }
    this.filteredCount = await this.query.model.countDocuments(
      this.filterCriteria
    );
    return this;
  }

  /**
   * Count total documents in the collection (ignoring filters).
   * Keeps method name `totalCount()` for backwards compatibility.
   */
  async totalCount() {
    this.totalCountValue = await this.query.model.estimatedDocumentCount();
    return this;
  }

  /**
   * Apply sorting: `?sort=price,-rating` → `.sort('price -rating')`
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  /**
   * Select specific fields: `?fields=name,price` → `.select('name price')`
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  /**
   * Apply pagination: `?page=2&limit=10`
   */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

export default APIFeatures;
