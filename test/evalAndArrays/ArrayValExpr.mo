within evalAndArrays;

block ArrayValExpr "Array parameters that are expressions and are used in the sequence"

  parameter Integer nZon = 3 "# of zones";
  parameter Real kBas = 1 "Base the array expressions are built from";
  parameter Real kZon[nZon] = {kBas*i for i in 1:nZon} "Expect {1, 2, 3}";
  parameter Real kSum = sum(kZon) "Array to scalar, expect 6";
  parameter Real kNor[nZon] = kZon/kSum "Array by scalar, expect {1/6, 1/3, 1/2}";
  parameter Real off[nZon] = kNor + fill(kBas, nZon) "Array addition";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u[nZon] "Input of each zone";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Sum as an output";

  Buildings.Controls.OBC.CDL.Reals.AddParameter addPar[nZon](
    final p=off) "Array expression used element by element";
  Buildings.Controls.OBC.CDL.Reals.MultiSum mulSum(
    final nin=nZon,
    final k=kNor) "Array expression used whole";

equation
  connect(u, addPar.u);
  connect(addPar.y, mulSum.u);
  connect(mulSum.y, y);

end ArrayValExpr;
