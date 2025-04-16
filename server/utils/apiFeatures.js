class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.filteredCount = null;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering with regex support for text search
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|in|nin)\b/g, match => `$${match}`);
    
    // Add text search if provided
    if (this.queryString.search) {
      const searchQuery = {
        $or: [
          { name: { $regex: this.queryString.search, $options: 'i' } },
          { description: { $regex: this.queryString.search, $options: 'i' } }
        ]
      };
      this.query = this.query.find({ ...JSON.parse(queryStr), ...searchQuery });
    } else {
      this.query = this.query.find(JSON.parse(queryStr));
    }

    return this;
  }

  async count() {
    this.filteredCount = await this.query.model.countDocuments(this.query.getFilter());
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

export default APIFeatures;