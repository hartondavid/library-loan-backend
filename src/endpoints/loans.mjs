import { Router } from "express";
import db from "../utils/database.mjs";
import { sendJsonResponse } from "../utils/utilFunctions.mjs";
import { userAuthMiddleware } from "../utils/middlewares/userAuthMiddleware.mjs";

const router = Router();

function toMySQLDatetime(dateString) {
    // Converts ISO string to 'YYYY-MM-DD HH:MM:SS'
    const date = new Date(dateString);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Adaugă o rezervare nouă 
router.post('/addLoan', userAuthMiddleware, async (req, res) => {

    try {

        const { book_id, start_date, quantity } = req.body;
        const userId = req.user?.id;

        if (!book_id || !start_date || !quantity) {
            return sendJsonResponse(res, false, 400, "Câmpurile book_id, start_date și quantity sunt obligatorii!", []);
        }


        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }
        const dateStartMySQL = toMySQLDatetime(start_date);
        // Calculează end_date cu 7 zile înainte de start_date
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(startDateObj.getDate() + 7);
        const dateEndMySQL = toMySQLDatetime(endDateObj.toISOString());

        const books = await db('books')
            .where({ 'books.id': book_id })
            .where('books.quantity', '>', 0)
            .first();

        if (!books) {
            return sendJsonResponse(res, false, 404, "Nu există carti!", []);
        }

        const remainingQuantity = books.quantity - quantity;

        if (remainingQuantity < 0) {
            return sendJsonResponse(res, false, 400, "Nu există suficiente carti!", []);
        }

        if (quantity > 5) {
            return sendJsonResponse(res, false, 400, "Nu poti imprumuta mai mult de 5 carti!", []);
        }

        console.log('remainingQuantity', remainingQuantity);
        await (await db.getKnex())('books')
            .where({ 'books.id': book_id })
            .update({ quantity: remainingQuantity })


        const result = await (await db.getKnex())('loans').insert({
            quantity, book_id, student_id: userId, librarian_id: userId,
            start_date: dateStartMySQL, end_date: dateEndMySQL
        }).returning('*');
        const loan = result[0];
        return sendJsonResponse(res, true, 201, "Împrumutul a fost adăugat cu succes!", { loan });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la adăugarea împrumutului!", { details: error.message });
    }
});

// Actualizează o rezervare
router.put('/updateLoanStatus/:loanId', userAuthMiddleware, async (req, res) => {

    try {
        const { loanId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;

        if (!status) {
            return sendJsonResponse(res, false, 400, "Câmpul status este obligatoriu!", []);
        }

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const loan = await (await db.getKnex())('loans')
            .where({ id: loanId }).first();

        if (!loan) return sendJsonResponse(res, false, 404, "Împrumutul nu există!", []);
        await (await db.getKnex())('loans').where({ id: loanId }).update({
            status: status || loan.status,
        });
        if (status === 'returned') {
            const book = await (await db.getKnex())('books').where({ id: loan.book_id }).first();
            const totalQuantity = book.quantity + loan.quantity;
            await (await db.getKnex())('books').where({ id: loan.book_id }).update({ quantity: totalQuantity });

        }


        const updated = await (await db.getKnex())('loans').where({ id: loanId }).first();
        return sendJsonResponse(res, true, 200, "Împrumutul a fost actualizat cu succes!", { loan: updated });
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la actualizarea împrumutului!", { details: error.message });
    }
});

// //Șterge o rezervare
router.delete('/deleteLoan/:loanId', userAuthMiddleware, async (req, res) => {

    try {
        const { loanId } = req.params;
        const userId = req.user?.id;

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const loan = await (await db.getKnex())('loans')
            .where({ id: loanId }).first();
        if (!loan) return sendJsonResponse(res, false, 404, "Împrumutul nu există!", []);
        await (await db.getKnex())('loans').where({ id: loanId }).del();
        return sendJsonResponse(res, true, 200, "Împrumutul a fost șters cu succes!", []);
    } catch (error) {
        return sendJsonResponse(res, false, 500, "Eroare la ștergerea împrumutului!", { details: error.message });
    }
});


router.get('/getLoans', userAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user?.id;

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .orWhere('rights.right_code', 3)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const loans = await (await db.getKnex())('loans')
            .join('books', 'loans.book_id', 'books.id')
            .join('users', 'loans.student_id', 'users.id')
            .whereNot('loans.status', 'returned')
            .select(
                'loans.id',
                'books.title',
                'books.author',
                'books.description',
                'books.photo',
                'loans.quantity',
                'loans.start_date',
                'loans.end_date',
                'loans.status',
                'loans.updated_at',
                'users.name as student_name',
            )
            .orderBy('loans.updated_at', 'desc')
        if (loans.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există împrumuturi!', []);
        }
        return sendJsonResponse(res, true, 200, 'Împrumuturi a fost găsite!', loans);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea împrumuturilor!', { details: error.message });
    }
});

router.get('/getLoansByStudentId', userAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user?.id;

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const loans = await (await db.getKnex())('loans')
            .join('books', 'loans.book_id', 'books.id')
            .join('users', 'loans.student_id', 'users.id')
            .where('loans.student_id', userId)
            .whereNot('loans.status', 'returned')
            .select(
                'loans.id',
                'books.title',
                'books.author',
                'books.description',
                'books.photo',
                'books.quantity',
                'loans.quantity',
                'loans.start_date',
                'loans.end_date',
                'loans.status',
                'loans.updated_at',
                'users.name as student_name',
            )
            .orderBy('loans.updated_at', 'desc')
        if (loans.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există împrumuturi!', []);
        }
        return sendJsonResponse(res, true, 200, 'Împrumuturi a fost găsite!', loans);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea împrumuturilor!', { details: error.message });
    }
});


router.get('/getPastLoans', userAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user?.id;

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 1)
            .orWhere('rights.right_code', 3)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const loans = await (await db.getKnex())('loans')
            .join('books', 'loans.book_id', 'books.id')
            .join('users', 'loans.student_id', 'users.id')
            .select(
                'loans.id',
                'books.title',
                'books.author',
                'books.description',
                'books.photo',
                'loans.quantity',
                'loans.start_date',
                'loans.end_date',
                'loans.status',
                'loans.updated_at',
                'users.name as student_name',
            )
            .where('loans.status', 'returned')
            .orderBy('loans.updated_at', 'desc')
        if (loans.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există împrumuturi!', []);
        }
        return sendJsonResponse(res, true, 200, 'Împrumuturi a fost găsite!', loans);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea împrumuturilor!', { details: error.message });
    }
});

router.get('/getPastLoansByStudentId', userAuthMiddleware, async (req, res) => {
    try {

        const userId = req.user?.id;

        const userRights = await (await db.getKnex())('user_rights')
            .join('rights', 'user_rights.right_id', 'rights.id')
            .where('rights.right_code', 2)
            .where('user_rights.user_id', userId)
            .first();

        if (!userRights) {
            return sendJsonResponse(res, false, 403, "Nu sunteti autorizat!", []);
        }

        const loans = await (await db.getKnex())('loans')
            .join('books', 'loans.book_id', 'books.id')
            .join('users', 'loans.student_id', 'users.id')
            .where('loans.student_id', userId)
            .select(
                'loans.id',
                'books.title',
                'books.author',
                'books.description',
                'books.photo',
                'books.quantity',
                'loans.quantity',
                'loans.start_date',
                'loans.end_date',
                'loans.status',
                'loans.updated_at',
                'users.name as student_name',
            )
            .where('loans.status', 'returned')
            .orderBy('loans.updated_at', 'desc')
        if (loans.length === 0) {
            return sendJsonResponse(res, false, 404, 'Nu există împrumuturi!', []);
        }
        return sendJsonResponse(res, true, 200, 'Împrumuturi a fost găsite!', loans);
    } catch (error) {
        return sendJsonResponse(res, false, 500, 'Eroare la preluarea împrumuturilor!', { details: error.message });
    }
});

export default router; 