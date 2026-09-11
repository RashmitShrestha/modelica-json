/*

Elementary Blocks in Modelica CDL that need to be flattened:
    Routing:
        EVERYTHING
    Reals:
        MultiMax - many in, one out 
        MultiMin - many in, one out
        MultiSum - many in, one out --- START WITH THIS * 
        Sort - many in, many out
    Integer:
        MultiSum - many in, one out
    Logical:
        MultiAnd - many in, one out
        MultiOr - many in, one out
    Continuous:
        MatrixGain - many in, many out
        MatrixMax - many in, many out
        MatrixMin - many in, many out
        MultiMax - many in, one out
        MultiMin - many in, one out
        MultiSum - many in, one out
        Sort - many in, many out

*/



/*
EXAMPLE

MultiSum nin = 3
special if nin = 1 (assuming no nin = 0)

repeat
u turn to u_1, u_2, u_3
multi sum to add


SO in different sections, the inputted u's will already be turned into u_1... by array flattening

but in the component definition need to turn multi sum into add blocks of n-1 times -> add.(nameOfMultiSumblock)_1 and ..._2

then in connections we connected u_1, u_2, u_3 to the corresponding add blocks in order 

*/

const arrayElemBlocks = [
    "MultiSum",
    "AddParameter",
    "MultiplyByParameter",
    "MultiMax",
    "MultiMin",

] 

{


}