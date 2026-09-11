within evalAndArrays;

block FlagsArray
  "Flag combination 3 of 4: array flattening on, expression evaluation off"

  parameter Integer nZon = 3 "# of zones";
  parameter Boolean status = if nZon > 1 then true else false
    "Derived from nZon, expect true";
  parameter Real k[nZon] = {i for i in 1:nZon}
    "Derived from nZon, expect {1, 2, 3}";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u[nZon] "Input of each zone";
  Buildings.Controls.OBC.CDL.Interfaces.RealInput uOne "Input of the sub sequence";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y[nZon] "Output of each zone";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput yOne "Output of the sub sequence";

  Flags_Unit uniArr(
    final nZon=nZon,
    final status=status) "The one sub sequence instance";

  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter multer[nZon](
    final k=k) "Array of elementary blocks, one per zone";

equation
  connect(u, multer.u);
  connect(multer.y, y);
  connect(uOne, uniArr.u);
  connect(uniArr.y, yOne);

end FlagsArray;
