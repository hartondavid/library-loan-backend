import { Router } from "express";
import users from '../endpoints/users.mjs'
import rights from '../endpoints/rights.mjs'
import books from '../endpoints/books.mjs'
import loans from '../endpoints/loans.mjs'
const router = Router();

router.use('/users', users)
router.use('/rights', rights)
router.use('/books', books)
router.use('/loans', loans)

export default router;

